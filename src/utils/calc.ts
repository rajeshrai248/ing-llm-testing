import type { BrokerApiResponse, FlattenedPricingRow, OtherFee, TransactionFee, NewBrokerResponseFormat, BrokerResponseInput } from "../types";

const EXAMPLE_AMOUNTS = [1000, 5000, 10000];

const roundToCents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const summarizeOtherFees = (fees: OtherFee[] | null): string => {
  if (!fees?.length) return "";
  return fees
    .map((fee) => {
      const parts: string[] = [];
      if (fee.value !== null) {
        const freq = fee.frequency ? `/${fee.frequency}` : "";
        parts.push(`${fee.value} ${fee.currency ?? ""}${freq}`.trim());
      }
      if (fee.notes) parts.push(fee.notes);
      const detail = parts.length ? ` (${parts.join(" • ")})` : "";
      return `${fee.name}${detail}`;
    })
    .join("; ");
};

const parsePercentage = (str: string): number | null => {
  const match = str.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? parseFloat(match[1]) : null;
};

const parseEuroAmount = (str: string): number | null => {
  const match = str.match(/€\s*(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
};

const parseMinMaxFromStructure = (str: string): { min?: number; max?: number } => {
  const result: { min?: number; max?: number } = {};
  const minMatch = str.match(/min\.\s*€?\s*(\d+(?:\.\d+)?)/i);
  const maxMatch = str.match(/max\.\s*€?\s*(\d+(?:\.\d+)?)/i);
  if (minMatch) result.min = parseFloat(minMatch[1]);
  if (maxMatch) result.max = parseFloat(maxMatch[1]);
  return result;
};

const isNewFormat = (obj: unknown): obj is NewBrokerResponseFormat => {
  if (!obj || typeof obj !== "object") return false;
  const candidate = obj as Record<string, unknown>;
  return (
    typeof candidate.broker_name === "string" &&
    (Array.isArray(candidate.fee_categories) ||
      Array.isArray(candidate.special_fees) ||
      typeof candidate.custody_charges === "string" ||
      typeof candidate.summary === "string")
  );
};

/**
 * Convert the new human-readable broker response format to the old structured format
 * This allows us to reuse all existing flattening logic
 */
export const convertNewFormatToOldFormat = (
  brokerData: NewBrokerResponseFormat[]
): BrokerApiResponse[] => {
  return brokerData
    .filter((broker) => !broker.error)
    .map((broker) => {
      const transactionFees: TransactionFee[] = [];
      const otherFees: OtherFee[] = [];

      // Parse fee categories into transaction fees
      if (broker.fee_categories) {
        broker.fee_categories.forEach((category) => {
          const categoryName = category.category.toLowerCase();

          // Detect instrument type and market from category name
          let instrumentType = "Equities";
          if (categoryName.includes("option")) instrumentType = "Options";
          else if (categoryName.includes("bond")) instrumentType = "Bonds";
          else if (categoryName.includes("fund")) instrumentType = "Funds";

          category.tiers.forEach((tier, tierIdx) => {
            let market = "Euronext";
            const volOrCond = tier.volume_or_condition.toLowerCase();

            // Extract market from volume_or_condition
            if (volOrCond.includes("brussels") || volOrCond.includes("amsterdam") || volOrCond.includes("paris")) {
              market = "Euronext";
            } else if (volOrCond.includes("frankfurt") || volOrCond.includes("xetra")) {
              market = "Frankfurt";
            } else if (volOrCond.includes("london") || volOrCond.includes("liffe")) {
              market = "London";
            } else if (volOrCond.includes("zurich") || volOrCond.includes("six")) {
              market = "Zurich";
            } else if (volOrCond.includes("us") || volOrCond.includes("cboe")) {
              market = "USA";
            } else if (volOrCond.includes("canada") || volOrCond.includes("tsx")) {
              market = "Canada";
            } else if (volOrCond.includes("Helsinki") || volOrCond.includes("omx")) {
              market = volOrCond.includes("Helsinki") ? "Helsinki" : volOrCond.includes("Stockholm") ? "Stockholm" : volOrCond.includes("Kopenhagen") ? "Copenhagen" : "Oslo";
            } else if (volOrCond.includes("index")) {
              market = "Index Options";
            }

            const feeStructure = tier.fee_structure;
            let base: number | null = null;
            let percent: number | null = null;
            let min: number | null = null;
            let max: number | null = null;
            let tieredPricing: Array<{ from: number | null; to: number | null; fee: number | null; currency: string }> | null = null;

            // Parse fee structure
            if (feeStructure === "Free" || feeStructure.toLowerCase() === "free") {
              base = 0;
            } else if (feeStructure.includes("%")) {
              percent = parsePercentage(feeStructure);
              if (feeStructure.includes("min")) {
                min = parseEuroAmount(feeStructure);
              }
            } else if (feeStructure.includes("€") || feeStructure.includes("$") || feeStructure.includes("£")) {
              // Could be tiered or fixed
              // Try to extract tier bounds from volume_or_condition
              const tierMatch = volOrCond.match(/(?:from|€?\s*)(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:to|€?\s*)(\d+(?:,\d{3})*(?:\.\d+)?)/);
              if (tierMatch) {
                const from = parseFloat(tierMatch[1].replace(/,/g, ""));
                const to = parseFloat(tierMatch[2].replace(/,/g, ""));
                const feeMatch = feeStructure.match(/€\s*(\d+(?:\.\d+)?)/);
                const fee = feeMatch ? parseFloat(feeMatch[1]) : null;
                tieredPricing = [{ from, to, fee, currency: "EUR" }];
              } else {
                // Fixed fee
                base = parseEuroAmount(feeStructure);
              }
            }

            const minMaxParsed = parseMinMaxFromStructure(feeStructure);
            if (minMaxParsed.min !== undefined) min = minMaxParsed.min;
            if (minMaxParsed.max !== undefined) max = minMaxParsed.max;

            transactionFees.push({
              instrument_type: instrumentType,
              market,
              pricing_type: tieredPricing ? "tiered" : "linear",
              formula_human: feeStructure,
              formula_structured: {
                base,
                percent,
                min,
                max
              },
              tiers: tieredPricing,
              notes: tier.notes || ""
            });
          });
        });
      }

      // Parse special fees into other fees
      if (broker.special_fees) {
        broker.special_fees.forEach((fee) => {
          const value = parseEuroAmount(fee.amount) || parsePercentage(fee.amount);
          const isPercent = fee.amount.includes("%");
          otherFees.push({
            name: fee.description,
            type: isPercent ? "percentage" : "fixed",
            value,
            currency: "EUR",
            frequency: fee.when_applied.includes("annual") ? "yearly" : "on transaction",
            notes: fee.when_applied
          });
        });
      }

      // Parse custody charges
      let custodyFee = null;
      if (broker.custody_charges && broker.custody_charges !== "None") {
        const isPercent = broker.custody_charges.includes("%");
        const value = isPercent ? parsePercentage(broker.custody_charges) : parseEuroAmount(broker.custody_charges);
        custodyFee = {
          type: isPercent ? "percentage" : "fixed",
          value,
          currency: "EUR",
          frequency: broker.custody_charges.includes("month") ? "monthly" : "yearly",
          notes: broker.custody_charges
        };
      }

      return {
        broker_name: broker.broker_name,
        country: "Belgium",
        source_url: broker.missing_data ? "https://broker.example.com" : "https://broker.example.com",
        source_type: "broker_website",
        source_last_checked: new Date().toISOString(),
        account_type: "private",
        pricing_model: {
          custody_fee: custodyFee,
          transaction_fees: transactionFees.length > 0 ? transactionFees : null,
          fx_fees: broker.special_fees
            ? {
                type: "percentage",
                value: broker.special_fees.find((f) => f.description.toLowerCase().includes("currency"))?.amount.includes("%")
                  ? parsePercentage(broker.special_fees.find((f) => f.description.toLowerCase().includes("currency"))?.amount || "")
                  : null,
                notes: "Currency conversion"
              }
            : null,
          other_fees: otherFees.length > 0 ? otherFees : null
        }
      } satisfies BrokerApiResponse;
    });
};

export const calcLinearOrTieredFee = (fee: TransactionFee, amount: number): number | null => {
  if (!fee) return null;

  const structured = fee.formula_structured;
  if (structured && (structured.base !== null || structured.percent !== null)) {
    const base = structured.base ?? 0;
    const percent = structured.percent ?? 0;
    let total = base + (percent / 100) * amount;
    if (structured.min !== null && structured.min !== undefined) total = Math.max(total, structured.min);
    if (structured.max !== null && structured.max !== undefined) total = Math.min(total, structured.max);
    return roundToCents(total);
  }

  if (fee.tiers?.length) {
    const tier = fee.tiers.find((t) => {
      const meetsFrom = t.from === null || t.from === undefined || amount >= t.from;
      const meetsTo = t.to === null || t.to === undefined || amount <= t.to;
      return meetsFrom && meetsTo;
    });
    if (tier && tier.fee !== null && tier.fee !== undefined) {
      return roundToCents(tier.fee);
    }
  }

  return null;
};

export const flattenApiData = (brokers: BrokerResponseInput[]): FlattenedPricingRow[] => {
  if (!Array.isArray(brokers)) return [];

  // Check if this is the new format and convert if needed
  const isNew = brokers.some(isNewFormat);
  const normalized: BrokerApiResponse[] = isNew
    ? convertNewFormatToOldFormat(brokers as NewBrokerResponseFormat[])
    : (brokers as BrokerApiResponse[]);

  return normalized.flatMap((broker) => {
    const custody = broker.pricing_model?.custody_fee ?? null;
    const fx = broker.pricing_model?.fx_fees ?? null;
    const otherSummary = summarizeOtherFees(broker.pricing_model?.other_fees ?? null);

    return (broker.pricing_model?.transaction_fees ?? []).map((fee, idx) => {
      const examples = {
        exampleFee1000: calcLinearOrTieredFee(fee, EXAMPLE_AMOUNTS[0]),
        exampleFee5000: calcLinearOrTieredFee(fee, EXAMPLE_AMOUNTS[1]),
        exampleFee10000: calcLinearOrTieredFee(fee, EXAMPLE_AMOUNTS[2])
      };

      return {
        id: `${broker.broker_name}-${fee.instrument_type}-${fee.market}-${idx}`,
        broker: broker.broker_name,
        instrumentType: fee.instrument_type,
        market: fee.market,
        pricingType: fee.pricing_type,
        baseFee: fee.formula_structured?.base ?? null,
        percentFee: fee.formula_structured?.percent ?? null,
        minFee: fee.formula_structured?.min ?? null,
        maxFee: fee.formula_structured?.max ?? null,
        custodyFeeType: custody?.type ?? "",
        custodyFeeValue: custody?.value ?? null,
        custodyFrequency: custody?.frequency ?? "",
        fxFeeType: fx?.type ?? "",
        fxFeeValue: fx?.value ?? null,
        otherFeesSummary: otherSummary,
        sourceUrl: broker.source_url,
        ...examples
      } satisfies FlattenedPricingRow;
    });
  });
};
