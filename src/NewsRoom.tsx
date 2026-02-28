import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { NewsItem } from './types';

interface NewsRoomProps {
    newsItems: NewsItem[];
}

const NewsRoom = ({ newsItems }: NewsRoomProps) => {
    const { t, i18n } = useTranslation();
    const currentLocale = i18n.language === 'fr-be' ? 'fr-BE' : i18n.language === 'nl-be' ? 'nl-BE' : 'en-GB';
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBroker, setSelectedBroker] = useState<string>('All');
    const [sortBy, setSortBy] = useState<'date' | 'broker'>('date');

    // Get unique brokers
    const brokers = useMemo(() => {
        const uniqueBrokers = new Set(newsItems.map(item => item.broker));
        return ['All', ...Array.from(uniqueBrokers).sort()];
    }, [newsItems]);

    // Filter and sort items
    const filteredItems = useMemo(() => {
        let result = [...newsItems];

        if (selectedBroker !== 'All') {
            result = result.filter(item => item.broker === selectedBroker);
        }

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(item =>
                item.title.toLowerCase().includes(lowerTerm) ||
                item.summary.toLowerCase().includes(lowerTerm)
            );
        }

        result.sort((a, b) => {
            if (sortBy === 'date') {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateB - dateA; // Newest first
            } else {
                return a.broker.localeCompare(b.broker);
            }
        });

        return result;
    }, [newsItems, selectedBroker, searchTerm, sortBy]);

    const mapBrokerName = (brokerName: string): string => {
        const brokerNameMap: Record<string, string> = {
            'Rebel': 'ReBel'
        };
        return brokerNameMap[brokerName] || brokerName;
    };

    return (
        <div className="news-room">
            {/* Header & Controls */}
            <div className="news-controls-section">
                <div className="news-header-content">
                    <h2>📰 {t('newsroom.title')}</h2>
                    <p>{t('newsroom.subtitle')}</p>
                </div>

                <div className="news-controls">
                    <div className="control-group">
                        <label>{t('newsroom.search')}</label>
                        <input
                            type="text"
                            placeholder={t('newsroom.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    <div className="control-group">
                        <label>{t('newsroom.broker')}</label>
                        <select
                            value={selectedBroker}
                            onChange={(e) => setSelectedBroker(e.target.value)}
                            className="filter-select"
                        >
                            {brokers.map(broker => (
                                <option key={broker} value={broker}>{mapBrokerName(broker)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="control-group">
                        <label>{t('newsroom.sortBy')}</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'date' | 'broker')}
                            className="filter-select"
                        >
                            <option value="date">{t('newsroom.newestFirst')}</option>
                            <option value="broker">{t('newsroom.brokerName')}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="news-stats">
                {t('newsroom.showing', { count: filteredItems.length })}
                {selectedBroker !== 'All' && ` ${t('newsroom.from', { broker: mapBrokerName(selectedBroker) })}`}
            </div>

            {/* Grid */}
            {filteredItems.length > 0 ? (
                <div className="news-grid">
                    {filteredItems.map((item, idx) => (
                        <article key={idx} className="news-card">
                            <div className="news-card-header">
                                <span className="news-broker-badge">{mapBrokerName(item.broker)}</span>
                                {item.date && (
                                    <time className="news-date">
                                        {new Date(item.date).toLocaleDateString(currentLocale)}
                                    </time>
                                )}
                            </div>

                            <h3 className="news-title">
                                <a href={item.url} target="_blank" rel="noopener noreferrer">
                                    {item.title}
                                </a>
                            </h3>

                            <p className="news-summary">{item.summary}</p>

                            <div className="news-card-footer">
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="read-more-btn">
                                    {t('newsroom.readMore')}
                                </a>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="news-empty-state">
                    <div className="empty-icon">🔍</div>
                    <h3>{t('newsroom.noNews')}</h3>
                    <p>{t('newsroom.noNewsHint')}</p>
                    <button
                        className="reset-btn"
                        onClick={() => {
                            setSearchTerm('');
                            setSelectedBroker('All');
                        }}
                    >
                        {t('newsroom.clearFilters')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default NewsRoom;
