import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

const Dashboard = () => {
  const [cityData, setCityData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [sourceData, setSourceData] = useState([]);
  const [listings, setListings] = useState([]);
  const [totalListings, setTotalListings] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [finderQuery, setFinderQuery] = useState('');
  const [finderFocused, setFinderFocused] = useState(false);
  const [sortOption, setSortOption] = useState('default');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const [activeKpiModal, setActiveKpiModal] = useState(null); // 'listings' | 'city' | 'category' | 'source' | null
  const [kpiSearchQuery, setKpiSearchQuery] = useState('');
  const [selectedKpiSubFilter, setSelectedKpiSubFilter] = useState(null);
  const [kpiModalPage, setKpiModalPage] = useState(1);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [cityRes, categoryRes, sourceRes, listingsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/dashboard/city-wise`),
        axios.get(`${API_BASE_URL}/dashboard/category-wise`),
        axios.get(`${API_BASE_URL}/dashboard/source-wise`),
        axios.get(`${API_BASE_URL}/listings?limit=500`),
      ]);

      setCityData(cityRes.data || []);
      setCategoryData(categoryRes.data || []);
      setSourceData(sourceRes.data || []);
      setListings(listingsRes.data?.listings || []);
      setTotalListings(listingsRes.data?.total || 0);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const topCity = cityData[0] || { city: '-', count: 0 };
  const topCategory = categoryData[0] || { category: '-', count: 0 };
  const topSource = sourceData[0] || { source: '-', count: 0 };

  const extendedMetrics = React.useMemo(() => {
    if (!listings.length) return {
      avgRating: 0, uniqueCities: 0, uniqueCategories: 0, uniqueSources: 0,
      highRatedCount: 0, highRatedPct: '0', oldestYear: '-', newestYear: '-',
      ratingDistribution: {}, establishmentDecades: {},
      topRatedBusinesses: [], cityRatingMap: [], open24h: 0,
    };

    let ratingSum = 0, ratingCount = 0, highRatedCount = 0, open24h = 0;
    const cities = new Set(), categories = new Set(), sources = new Set();
    const ratingBuckets = { '4.5 - 5.0': 0, '4.0 - 4.4': 0, '3.5 - 3.9': 0, '3.0 - 3.4': 0, 'Below 3.0': 0 };
    const decades = {};
    const cityRatings = {};
    let oldestYear = 9999, newestYear = 0;

    listings.forEach((item) => {
      cities.add(item.city);
      categories.add(item.category);
      sources.add(item.source);
      if (item.opening_time === '24 Hours') open24h++;

      const r = parseFloat(item.rating);
      if (!isNaN(r)) {
        ratingSum += r;
        ratingCount++;
        if (r >= 4.5) { ratingBuckets['4.5 - 5.0']++; highRatedCount++; }
        else if (r >= 4.0) ratingBuckets['4.0 - 4.4']++;
        else if (r >= 3.5) ratingBuckets['3.5 - 3.9']++;
        else if (r >= 3.0) ratingBuckets['3.0 - 3.4']++;
        else ratingBuckets['Below 3.0']++;
      }

      const yr = parseInt(item.established_year);
      if (!isNaN(yr)) {
        if (yr < oldestYear) oldestYear = yr;
        if (yr > newestYear) newestYear = yr;
        const decade = `${Math.floor(yr / 10) * 10}s`;
        decades[decade] = (decades[decade] || 0) + 1;
      }

      if (item.city) {
        if (!cityRatings[item.city]) cityRatings[item.city] = { sum: 0, count: 0 };
        if (!isNaN(r)) { cityRatings[item.city].sum += r; cityRatings[item.city].count++; }
      }
    });

    const topRatedBusinesses = [...listings]
      .filter(l => l.rating)
      .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
      .slice(0, 10);

    const cityRatingMap = Object.entries(cityRatings)
      .map(([city, d]) => ({ city, avgRating: d.count ? (d.sum / d.count).toFixed(2) : 'N/A', count: d.count }))
      .sort((a, b) => parseFloat(b.avgRating) - parseFloat(a.avgRating));

    return {
      avgRating: ratingCount ? (ratingSum / ratingCount).toFixed(2) : 0,
      uniqueCities: cities.size,
      uniqueCategories: categories.size,
      uniqueSources: sources.size,
      highRatedCount,
      highRatedPct: listings.length ? ((highRatedCount / listings.length) * 100).toFixed(1) : '0',
      oldestYear: oldestYear === 9999 ? '-' : oldestYear,
      newestYear: newestYear === 0 ? '-' : newestYear,
      ratingDistribution: ratingBuckets,
      establishmentDecades: decades,
      topRatedBusinesses,
      cityRatingMap,
      open24h,
    };
  }, [listings]);

  const cityBreakdown = React.useMemo(() => {
    if (!listings.length) return [];
    const map = {};
    listings.forEach((item) => {
      if (!map[item.city]) {
        map[item.city] = { city: item.city, count: 0, categories: {}, businesses: [] };
      }
      map[item.city].count += 1;
      map[item.city].categories[item.category] = (map[item.city].categories[item.category] || 0) + 1;
      map[item.city].businesses.push(item);
    });

    return Object.values(map).map((c) => {
      let topCat = 'N/A';
      let maxCatCount = 0;
      Object.entries(c.categories).forEach(([cat, count]) => {
        if (count > maxCatCount) {
          maxCatCount = count;
          topCat = cat;
        }
      });
      return {
        city: c.city,
        count: c.count,
        percentage: ((c.count / listings.length) * 100).toFixed(1),
        topCategory: topCat,
        businesses: c.businesses,
      };
    }).sort((a, b) => b.count - a.count);
  }, [listings]);

  const categoryBreakdown = React.useMemo(() => {
    if (!listings.length) return [];
    const map = {};
    listings.forEach((item) => {
      if (!map[item.category]) {
        map[item.category] = { category: item.category, count: 0, ratingSum: 0, ratingCount: 0, businesses: [] };
      }
      map[item.category].count += 1;
      if (item.rating) {
        map[item.category].ratingSum += parseFloat(item.rating);
        map[item.category].ratingCount += 1;
      }
      map[item.category].businesses.push(item);
    });

    return Object.values(map).map((cat) => ({
      category: cat.category,
      count: cat.count,
      percentage: ((cat.count / listings.length) * 100).toFixed(1),
      avgRating: cat.ratingCount ? (cat.ratingSum / cat.ratingCount).toFixed(1) : 'N/A',
      businesses: cat.businesses,
    })).sort((a, b) => b.count - a.count);
  }, [listings]);

  const sourceBreakdown = React.useMemo(() => {
    if (!listings.length) return [];
    const map = {};
    listings.forEach((item) => {
      if (!map[item.source]) {
        map[item.source] = { source: item.source, count: 0, cities: {}, businesses: [] };
      }
      map[item.source].count += 1;
      map[item.source].cities[item.city] = (map[item.source].cities[item.city] || 0) + 1;
      map[item.source].businesses.push(item);
    });

    return Object.values(map).map((s) => {
      let topCityName = 'N/A';
      let maxCityCount = 0;
      Object.entries(s.cities).forEach(([city, count]) => {
        if (count > maxCityCount) {
          maxCityCount = count;
          topCityName = city;
        }
      });
      return {
        source: s.source,
        count: s.count,
        percentage: ((s.count / listings.length) * 100).toFixed(1),
        topCity: topCityName,
        businesses: s.businesses,
      };
    }).sort((a, b) => b.count - a.count);
  }, [listings]);

  const cityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: 'Plus Jakarta Sans', size: 14, weight: 'bold' },
        bodyFont: { family: 'Plus Jakarta Sans', size: 13 },
        padding: 12,
        borderColor: '#334155',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      y: {
        ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
    },
  };

  const cityColors = {
    bg: ['rgba(6, 182, 212, 0.85)', 'rgba(14, 165, 233, 0.85)', 'rgba(59, 130, 246, 0.85)', 'rgba(20, 184, 166, 0.85)', 'rgba(16, 185, 129, 0.85)'],
    border: ['#06b6d4', '#0ea5e9', '#3b82f6', '#14b8a6', '#10b981'],
    hover: ['#0891b2', '#0284c7', '#2563eb', '#0d9488', '#059669']
  };

  const categoryColors = {
    bg: ['rgba(244, 63, 94, 0.85)', 'rgba(236, 72, 153, 0.85)', 'rgba(217, 70, 239, 0.85)', 'rgba(168, 85, 247, 0.85)', 'rgba(139, 92, 246, 0.85)', 'rgba(249, 115, 22, 0.85)', 'rgba(245, 158, 11, 0.85)'],
    border: ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#f97316', '#f59e0b'],
    hover: ['#e11d48', '#db2777', '#c026d3', '#9333ea', '#7c3aed', '#ea580c', '#d97706']
  };

  const sourceColors = {
    bg: ['rgba(250, 204, 21, 0.85)', 'rgba(132, 204, 22, 0.85)', 'rgba(34, 197, 94, 0.85)', 'rgba(163, 230, 53, 0.85)', 'rgba(251, 146, 60, 0.85)'],
    border: ['#facc15', '#84cc16', '#22c55e', '#a3e635', '#fb923c'],
    hover: ['#eab308', '#65a30d', '#16a34a', '#84cc16', '#f97316']
  };

  const getColors = (dataArray, colors) => dataArray.map((_, i) => colors[i % colors.length]);

  const cityChartData = {
    labels: cityData.map((d) => d.city),
    datasets: [
      {
        label: 'Business Count',
        data: cityData.map((d) => d.count),
        backgroundColor: getColors(cityData, cityColors.bg),
        borderColor: getColors(cityData, cityColors.border),
        borderWidth: 1,
        borderRadius: 6,
        hoverBackgroundColor: getColors(cityData, cityColors.hover),
      },
    ],
  };

  const categoryChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: 'Plus Jakarta Sans', size: 14, weight: 'bold' },
        bodyFont: { family: 'Plus Jakarta Sans', size: 13 },
        padding: 12,
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      y: {
        ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
    },
  };

  const categoryChartData = {
    labels: categoryData.map((d) => d.category),
    datasets: [
      {
        label: 'Business Count',
        data: categoryData.map((d) => d.count),
        backgroundColor: getColors(categoryData, categoryColors.bg),
        borderColor: getColors(categoryData, categoryColors.border),
        borderWidth: 1,
        borderRadius: 6,
        hoverBackgroundColor: getColors(categoryData, categoryColors.hover),
      },
    ],
  };

  const sourceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#cbd5e1',
          font: { family: 'Plus Jakarta Sans', size: 12, weight: '500' },
          padding: 16,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: 'Plus Jakarta Sans', size: 14, weight: 'bold' },
        bodyFont: { family: 'Plus Jakarta Sans', size: 13 },
        padding: 12,
      },
    },
  };

  const sourceChartData = {
    labels: sourceData.map((d) => d.source),
    datasets: [
      {
        label: 'Listings by Source',
        data: sourceData.map((d) => d.count),
        backgroundColor: getColors(sourceData, sourceColors.bg),
        borderColor: '#111827',
        borderWidth: 2,
        hoverBackgroundColor: getColors(sourceData, sourceColors.hover),
      },
    ],
  };

  const filteredListings = listings.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      (item.business_name || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.city || '').toLowerCase().includes(q) ||
      (item.source || '').toLowerCase().includes(q)
    );
  });

  const sortedListings = [...filteredListings].sort((a, b) => {
    if (sortOption === 'name') {
      return (a.business_name || '').localeCompare(b.business_name || '');
    }
    if (sortOption === 'city') {
      return (a.city || '').localeCompare(b.city || '');
    }
    if (sortOption === 'category') {
      return (a.category || '').localeCompare(b.category || '');
    }
    if (sortOption === 'rating') {
      return (b.rating || 0) - (a.rating || 0);
    }
    return 0;
  });

  const finderResults = finderQuery.trim().length > 0
    ? listings.filter((item) => {
        const q = finderQuery.toLowerCase();
        return (
          (item.business_name || '').toLowerCase().includes(q) ||
          (item.category || '').toLowerCase().includes(q) ||
          (item.city || '').toLowerCase().includes(q)
        );
      }).slice(0, 8)
    : [];

  return (
    <div className="dashboard-container">
      
      <header className="dashboard-header">
        <div className="header-title-section">
          <div className="logo-badge">📊</div>
          <div>
            <h1>Metric Flow</h1>
            <p className="header-subtitle">
              Real-time Business Directory Analytics • React + FastAPI + MySQL Integration
            </p>
          </div>
        </div>
        <div className="header-actions">
          <div className="status-badge">
            <span className="pulse-dot"></span>
            MySQL & FastAPI Connected
          </div>
          <button className="btn-refresh" onClick={fetchDashboardData}>
            🔄 Refresh ({lastUpdated || 'Live'})
          </button>
        </div>
      </header>

      <section className="finder-section">
        <div className="finder-bar">
          <span className="finder-icon">&#128269;</span>
          <input
            id="business-finder-input"
            type="text"
            className="finder-input"
            placeholder="Find a business by name, category, or city..."
            value={finderQuery}
            onChange={(e) => setFinderQuery(e.target.value)}
            onFocus={() => setFinderFocused(true)}
            onBlur={() => setTimeout(() => setFinderFocused(false), 200)}
          />
          {finderQuery && (
            <button
              className="finder-clear"
              onClick={() => setFinderQuery('')}
              aria-label="Clear search"
            >
              &#10005;
            </button>
          )}
        </div>

        {finderFocused && finderQuery.trim().length > 0 && (
          <div className="finder-results">
            {finderResults.length > 0 ? (
              finderResults.map((item) => (
                <div
                  className="finder-result-row"
                  key={item.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedBusiness(item);
                    setFinderFocused(false);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedBusiness(item);
                    setFinderFocused(false);
                  }}
                >
                  <div className="finder-result-name">{item.business_name}</div>
                  <div className="finder-result-meta">
                    <span className="finder-tag finder-tag-category">{item.category}</span>
                    <span className="finder-tag finder-tag-city">&#128205; {item.city}</span>
                    {item.rating && <span className="finder-tag" style={{background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)'}}>⭐ {item.rating}</span>}
                    {item.opening_time && <span className="finder-tag" style={{background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)'}}>🕒 {item.opening_time} - {item.closing_time}</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className="finder-no-results">
                No businesses match &ldquo;<strong>{finderQuery}</strong>&rdquo;
              </div>
            )}
          </div>
        )}
      </section>

      <section className="kpi-grid">
        <div
          className="kpi-card kpi-card-clickable"
          onClick={() => {
            setActiveKpiModal('listings');
            setKpiSearchQuery('');
            setSelectedKpiSubFilter(null);
            setKpiModalPage(1);
          }}
          title="Click to expand 3/4th screen master listings window"
        >
          <div>
            <div className="kpi-label">Total Listings</div>
            <div className="kpi-value">{totalListings || 500}</div>
            <div className="kpi-subtext">Active records in listing_master ↗</div>
          </div>
          <div className="kpi-icon-wrapper icon-blue">📋</div>
        </div>

        <div
          className="kpi-card kpi-card-clickable"
          onClick={() => {
            setActiveKpiModal('city');
            setKpiSearchQuery('');
            setSelectedKpiSubFilter(null);
            setKpiModalPage(1);
          }}
          title="Click to expand 3/4th screen city analytics window"
        >
          <div>
            <div className="kpi-label">Top City</div>
            <div className="kpi-value">{topCity.city}</div>
            <div className="kpi-subtext">{topCity.count} business listings ↗</div>
          </div>
          <div className="kpi-icon-wrapper icon-purple">🏙️</div>
        </div>

        <div
          className="kpi-card kpi-card-clickable"
          onClick={() => {
            setActiveKpiModal('category');
            setKpiSearchQuery('');
            setSelectedKpiSubFilter(null);
            setKpiModalPage(1);
          }}
          title="Click to expand 3/4th screen category analytics window"
        >
          <div>
            <div className="kpi-label">Top Category</div>
            <div className="kpi-value">{topCategory.category}</div>
            <div className="kpi-subtext">{topCategory.count} registered businesses ↗</div>
          </div>
          <div className="kpi-icon-wrapper icon-indigo">🏷️</div>
        </div>

        <div
          className="kpi-card kpi-card-clickable"
          onClick={() => {
            setActiveKpiModal('source');
            setKpiSearchQuery('');
            setSelectedKpiSubFilter(null);
            setKpiModalPage(1);
          }}
          title="Click to expand 3/4th screen platform source window"
        >
          <div>
            <div className="kpi-label">Lead Platform Source</div>
            <div className="kpi-value">{topSource.source}</div>
            <div className="kpi-subtext">{topSource.count} scraped records ↗</div>
          </div>
          <div className="kpi-icon-wrapper icon-amber">🌐</div>
        </div>
        
        <div
          className="kpi-card kpi-card-clickable"
          onClick={() => {
            setActiveKpiModal('avgRating');
            setKpiSearchQuery('');
            setSelectedKpiSubFilter(null);
            setKpiModalPage(1);
          }}
          title="Click to expand rating analytics window"
        >
          <div>
            <div className="kpi-label">Avg. Rating</div>
            <div className="kpi-value">⭐ {extendedMetrics.avgRating}</div>
            <div className="kpi-subtext">Across all rated businesses ↗</div>
          </div>
          <div className="kpi-icon-wrapper icon-amber">📈</div>
        </div>

        <div
          className="kpi-card kpi-card-clickable"
          onClick={() => {
            setActiveKpiModal('highRated');
            setKpiSearchQuery('');
            setSelectedKpiSubFilter(null);
            setKpiModalPage(1);
          }}
          title="Click to expand high-rated businesses window"
        >
          <div>
            <div className="kpi-label">High Rated (4.5+)</div>
            <div className="kpi-value">{extendedMetrics.highRatedCount}</div>
            <div className="kpi-subtext">{extendedMetrics.highRatedPct}% of all listings ↗</div>
          </div>
          <div className="kpi-icon-wrapper icon-emerald">🏆</div>
        </div>

        <div
          className="kpi-card kpi-card-clickable"
          onClick={() => {
            setActiveKpiModal('coverage');
            setKpiSearchQuery('');
            setSelectedKpiSubFilter(null);
            setKpiModalPage(1);
          }}
          title="Click to expand city coverage analytics window"
        >
          <div>
            <div className="kpi-label">City Coverage</div>
            <div className="kpi-value">{extendedMetrics.uniqueCities}</div>
            <div className="kpi-subtext">{extendedMetrics.uniqueCategories} categories • {extendedMetrics.uniqueSources} sources ↗</div>
          </div>
          <div className="kpi-icon-wrapper icon-indigo">🗺️</div>
        </div>

        <div
          className="kpi-card kpi-card-clickable"
          onClick={() => {
            setActiveKpiModal('open24h');
            setKpiSearchQuery('');
            setSelectedKpiSubFilter(null);
            setKpiModalPage(1);
          }}
          title="Click to expand 24h businesses window"
        >
          <div>
            <div className="kpi-label">24h Businesses</div>
            <div className="kpi-value">{extendedMetrics.open24h}</div>
            <div className="kpi-subtext">Operating round the clock ↗</div>
          </div>
          <div className="kpi-icon-wrapper icon-purple">🌙</div>
        </div>

        <div className="kpi-card" title="Information only">
          <div>
            <div className="kpi-label">Oldest Business</div>
            <div className="kpi-value">Since {extendedMetrics.oldestYear}</div>
            <div className="kpi-subtext">Longest standing record</div>
          </div>
          <div className="kpi-icon-wrapper" style={{background: 'rgba(236, 72, 153, 0.18)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.3)'}}>🏛️</div>
        </div>

        <div className="kpi-card" title="Information only">
          <div>
            <div className="kpi-label">Newest Business</div>
            <div className="kpi-value">Since {extendedMetrics.newestYear}</div>
            <div className="kpi-subtext">Most recently established</div>
          </div>
          <div className="kpi-icon-wrapper" style={{background: 'rgba(14, 165, 233, 0.18)', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.3)'}}>🆕</div>
        </div>
      </section>

      {loading ? (
        <div className="loading-spinner">
          <span>Loading analytics from FastAPI backend...</span>
        </div>
      ) : (
        <section className="charts-grid">
          
          <div className="chart-card chart-card-half">
            <div className="chart-header">
              <h2>🏙️ City-Wise Business Count</h2>
            </div>
            <div className="chart-body">
              <Bar data={cityChartData} options={cityChartOptions} />
            </div>
          </div>

          <div className="chart-card chart-card-half">
            <div className="chart-header">
              <h2>🏷️ Category-Wise Business Count</h2>
            </div>
            <div className="chart-body">
              <Bar data={categoryChartData} options={categoryChartOptions} />
            </div>
          </div>

          <div className="chart-card chart-card-half" style={{ margin: '0 auto', gridColumn: 'span 12' }}>
            <div className="chart-header">
              <h2>🌐 Source-Wise Business Distribution (Pie Chart)</h2>
            </div>
            <div className="chart-body" style={{ height: '340px' }}>
              <Pie data={sourceChartData} options={sourceChartOptions} />
            </div>
          </div>

          <div className="chart-card chart-card-half">
            <div className="chart-header">
              <h2>⭐ Rating Distribution</h2>
            </div>
            <div className="chart-body" style={{ height: '340px' }}>
              <Doughnut
                data={{
                  labels: Object.keys(extendedMetrics.ratingDistribution),
                  datasets: [{
                    data: Object.values(extendedMetrics.ratingDistribution),
                    backgroundColor: [
                      'rgba(16, 185, 129, 0.85)',
                      'rgba(6, 182, 212, 0.85)',
                      'rgba(245, 158, 11, 0.85)',
                      'rgba(249, 115, 22, 0.85)',
                      'rgba(239, 68, 68, 0.85)',
                    ],
                    borderColor: '#0d1322',
                    borderWidth: 3,
                    hoverOffset: 8,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '55%',
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#cbd5e1', font: { family: 'Plus Jakarta Sans', size: 12, weight: '500' }, padding: 14, usePointStyle: true },
                    },
                    tooltip: { backgroundColor: '#1e293b', titleFont: { family: 'Plus Jakarta Sans', size: 14, weight: 'bold' }, bodyFont: { family: 'Plus Jakarta Sans', size: 13 }, padding: 12 },
                  },
                }}
              />
            </div>
          </div>

          <div className="chart-card chart-card-half">
            <div className="chart-header">
              <h2>📅 Establishment Era Timeline</h2>
            </div>
            <div className="chart-body" style={{ height: '340px' }}>
              <Line
                data={{
                  labels: Object.keys(extendedMetrics.establishmentDecades).sort(),
                  datasets: [{
                    label: 'Businesses Founded',
                    data: Object.keys(extendedMetrics.establishmentDecades).sort().map(k => extendedMetrics.establishmentDecades[k]),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                    pointBackgroundColor: '#a78bfa',
                    pointBorderColor: '#8b5cf6',
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2.5,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: '#1e293b', titleFont: { family: 'Plus Jakarta Sans', size: 14, weight: 'bold' }, bodyFont: { family: 'Plus Jakarta Sans', size: 13 }, padding: 12 },
                  },
                  scales: {
                    x: { ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                    y: { ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                  },
                }}
              />
            </div>
          </div>
        </section>
      )}

      {!loading && (
        <section className="insights-grid">
          
          <div className="insight-card insight-card-wide">
            <div className="chart-header">
              <h2>🏆 Top 10 Highest Rated Businesses</h2>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Business Name</th>
                    <th>Category</th>
                    <th>City</th>
                    <th>Rating</th>
                    <th>Since</th>
                  </tr>
                </thead>
                <tbody>
                  {extendedMetrics.topRatedBusinesses.map((item, idx) => (
                    <tr key={item.id} className="clickable-row" onClick={() => setSelectedBusiness(item)} title="Click for details">
                      <td>
                        <span className="rank-badge" style={{
                          background: idx === 0 ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : idx === 1 ? 'linear-gradient(135deg, #94a3b8, #cbd5e1)' : idx === 2 ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'rgba(255,255,255,0.08)',
                          color: idx < 3 ? '#0f172a' : '#94a3b8',
                        }}>#{idx + 1}</span>
                      </td>
                      <td style={{ fontWeight: '700', color: '#f8fafc' }}>{item.business_name}</td>
                      <td><span className="finder-tag finder-tag-category">{item.category}</span></td>
                      <td><span className="finder-tag finder-tag-city">📍 {item.city}</span></td>
                      <td style={{ color: '#f59e0b', fontWeight: '700', fontSize: '1rem' }}>⭐ {item.rating}</td>
                      <td>{item.established_year || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="insight-card insight-card-narrow">
            <div className="chart-header">
              <h2>🗺️ City Avg. Rating</h2>
            </div>
            <div className="city-rating-list">
              {extendedMetrics.cityRatingMap.map((item) => {
                const rVal = parseFloat(item.avgRating);
                const barColor = rVal >= 4.2 ? '#10b981' : rVal >= 3.8 ? '#06b6d4' : rVal >= 3.5 ? '#f59e0b' : '#ef4444';
                return (
                  <div className="city-rating-row" key={item.city}>
                    <div className="city-rating-label">
                      <span className="city-rating-name">{item.city}</span>
                      <span className="city-rating-value" style={{ color: barColor }}>⭐ {item.avgRating}</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${(rVal / 5) * 100}%`, background: barColor }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="insight-card insight-card-narrow">
            <div className="chart-header">
              <h2>📊 Quick Stats</h2>
            </div>
            <div className="quick-stats-list">
              <div className="quick-stat-row">
                <span className="quick-stat-icon">🏢</span>
                <span className="quick-stat-label">Oldest Business</span>
                <span className="quick-stat-value">Since {extendedMetrics.oldestYear}</span>
              </div>
              <div className="quick-stat-row">
                <span className="quick-stat-icon">🆕</span>
                <span className="quick-stat-label">Newest Business</span>
                <span className="quick-stat-value">Since {extendedMetrics.newestYear}</span>
              </div>
              <div className="quick-stat-row">
                <span className="quick-stat-icon">🏙️</span>
                <span className="quick-stat-label">Cities Covered</span>
                <span className="quick-stat-value">{extendedMetrics.uniqueCities}</span>
              </div>
              <div className="quick-stat-row">
                <span className="quick-stat-icon">🏷️</span>
                <span className="quick-stat-label">Industry Sectors</span>
                <span className="quick-stat-value">{extendedMetrics.uniqueCategories}</span>
              </div>
              <div className="quick-stat-row">
                <span className="quick-stat-icon">🌐</span>
                <span className="quick-stat-label">Data Sources</span>
                <span className="quick-stat-value">{extendedMetrics.uniqueSources}</span>
              </div>
              <div className="quick-stat-row">
                <span className="quick-stat-icon">🌙</span>
                <span className="quick-stat-label">24hr Open</span>
                <span className="quick-stat-value">{extendedMetrics.open24h}</span>
              </div>
              <div className="quick-stat-row">
                <span className="quick-stat-icon">🏆</span>
                <span className="quick-stat-label">Premium (4.5+)</span>
                <span className="quick-stat-value">{extendedMetrics.highRatedCount}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="table-card">
        <div className="table-header">
          <div>
            <h2>📋 Master Listing Directory</h2>
            <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
              Showing {sortedListings.length} of {listings.length} retrieved MySQL database entries
            </p>
          </div>
          <div className="table-controls">
            <div className="sort-box">
              <span className="sort-label">Sort Order:</span>
              <select
                id="sort-select-dropdown"
                className="sort-select"
                value={sortOption}
                onChange={(e) => { setSortOption(e.target.value); setCurrentPage(1); }}
              >
                <option value="default">Default Order</option>
                <option value="name">Sort by Name A-Z</option>
                <option value="city">Sort by Cities</option>
                <option value="category">Sort by Category</option>
                <option value="rating">Sort by Rating</option>
              </select>
            </div>
            <div className="search-box">
              <input
                type="text"
                placeholder="🔍 Search name, city, category, source..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                
                <th>Business Name</th>
                <th>Category</th>
                <th>City</th>
                <th>Rating</th>
                <th>Hours</th>
                <th>Since</th>
                <th>Phone</th>
                
              </tr>
            </thead>
            <tbody>
              {sortedListings
                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                .map((item) => (
                <tr
                  key={item.id}
                  className="clickable-row"
                  onClick={() => setSelectedBusiness(item)}
                  title="Click to view business details"
                >
                  
                  <td style={{ fontWeight: '600', color: '#f8fafc' }}>{item.business_name}</td>
                  <td>{item.category}</td>
                  <td>{item.city}</td>
                  <td style={{ color: '#f59e0b', fontWeight: '500' }}>{item.rating ? `\u2b50 ${item.rating}` : '-'}</td>
                  <td style={{ fontSize: '0.85rem' }}>{item.opening_time ? `${item.opening_time} - ${item.closing_time}` : '-'}</td>
                  <td>{item.established_year || '-'}</td>
                  <td style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{item.phone}</td>
                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(() => {
          const totalPages = Math.ceil(sortedListings.length / ITEMS_PER_PAGE);
          if (totalPages <= 1) return null;
          return (
            <div className="pagination-section">
              <p className="pagination-info">
                Showing Page <span className="pagination-highlight">{currentPage}</span> of <span className="pagination-highlight">{totalPages}</span>
              </p>
              <div className="pagination-divider"></div>
              <div className="pagination-buttons">
                {currentPage > 1 && (
                  <button
                    className="page-btn page-btn-nav"
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    &laquo;
                  </button>
                )}
                {(() => {
                  let pages = [];
                  if (totalPages <= 7) {
                    pages = Array.from({ length: totalPages }, (_, i) => i + 1);
                  } else {
                    if (currentPage <= 4) {
                      pages = [1, 2, 3, 4, 5, '...', totalPages];
                    } else if (currentPage >= totalPages - 3) {
                      pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                    } else {
                      pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
                    }
                  }
                  return pages.map((page, idx) =>
                    page === '...' ? (
                      <span key={`ellipsis-${idx}`} className="page-ellipsis" style={{ padding: '0 6px', color: '#64748b', alignSelf: 'center' }}>...</span>
                    ) : (
                      <button
                        key={page}
                        className={`page-btn ${page === currentPage ? 'page-btn-active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    )
                  );
                })()}
                {currentPage < totalPages && (
                  <button
                    className="page-btn page-btn-nav"
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    &raquo;
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </section>

      {activeKpiModal && (
        <div
          className="modal-overlay modal-overlay-kpi"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveKpiModal(null);
              setSelectedKpiSubFilter(null);
            }
          }}
        >
          <div className="kpi-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="kpi-modal-header">
              <div className="kpi-modal-title-group">
                <span className="kpi-modal-badge">
                  {activeKpiModal === 'listings' && '📋'}
                  {activeKpiModal === 'city' && '🏙️'}
                  {activeKpiModal === 'category' && '🏷️'}
                  {activeKpiModal === 'source' && '🌐'}
                  {activeKpiModal === 'avgRating' && '⭐'}
                  {activeKpiModal === 'highRated' && '🏆'}
                  {activeKpiModal === 'coverage' && '🗺️'}
                  {activeKpiModal === 'open24h' && '🌙'}
                </span>
                <div>
                  <h3 className="kpi-modal-title">
                    {activeKpiModal === 'listings' && 'Master Listing Directory (500 Records)'}
                    {activeKpiModal === 'city' && 'City-Wise Business Analytics'}
                    {activeKpiModal === 'category' && 'Category-Wise Industry Breakdown'}
                    {activeKpiModal === 'source' && 'Lead Platform Source Distribution'}
                    {activeKpiModal === 'avgRating' && 'Average Rating Analytics'}
                    {activeKpiModal === 'highRated' && 'High-Rated Businesses (4.5+)'}
                    {activeKpiModal === 'coverage' && 'City & Category Coverage'}
                    {activeKpiModal === 'open24h' && '24-Hour Operating Businesses'}
                  </h3>
                  <p className="kpi-modal-subtitle">
                    {activeKpiModal === 'listings' && 'Complete view of all registered business listings'}
                    {activeKpiModal === 'city' && 'Breakdown of business counts, top categories, and percentage share by city'}
                    {activeKpiModal === 'category' && 'Breakdown of business counts, average ratings, and percentage share by sector'}
                    {activeKpiModal === 'source' && 'Breakdown of scraped records, lead platforms, and city distribution'}
                    {activeKpiModal === 'avgRating' && `Overall avg: ⭐ ${extendedMetrics.avgRating} — drill down by city or rating bucket`}
                    {activeKpiModal === 'highRated' && `${extendedMetrics.highRatedCount} businesses with rating ≥ 4.5 (${extendedMetrics.highRatedPct}% of all listings)`}
                    {activeKpiModal === 'coverage' && `${extendedMetrics.uniqueCities} cities • ${extendedMetrics.uniqueCategories} categories • ${extendedMetrics.uniqueSources} platforms`}
                    {activeKpiModal === 'open24h' && `${extendedMetrics.open24h} businesses operating 24 hours — search or filter by city`}
                  </p>
                </div>
              </div>

              <div className="kpi-modal-search-wrapper">
                <span className="search-icon-sm">🔍</span>
                <input
                  type="text"
                  className="kpi-modal-search-input"
                  placeholder={
                    selectedKpiSubFilter
                      ? `Filter businesses in ${selectedKpiSubFilter}...`
                      : activeKpiModal === 'listings'
                      ? 'Search by name, city, category, phone...'
                      : activeKpiModal === 'city'
                      ? 'Search cities...'
                      : activeKpiModal === 'category'
                      ? 'Search categories...'
                      : activeKpiModal === 'avgRating'
                      ? 'Search by city or filter by rating...'
                      : activeKpiModal === 'highRated'
                      ? 'Search high-rated businesses...'
                      : activeKpiModal === 'coverage'
                      ? 'Search cities or categories...'
                      : activeKpiModal === 'open24h'
                      ? 'Search 24h businesses by name or city...'
                      : 'Search platform sources...'
                  }
                  value={kpiSearchQuery}
                  onChange={(e) => {
                    setKpiSearchQuery(e.target.value);
                    setKpiModalPage(1);
                  }}
                />
                {kpiSearchQuery && (
                  <button className="search-clear-sm" onClick={() => setKpiSearchQuery('')}>✕</button>
                )}
              </div>

              <button
                className="modal-close-btn"
                onClick={() => {
                  setActiveKpiModal(null);
                  setSelectedKpiSubFilter(null);
                }}
                aria-label="Close modal"
              >
                &#10005;
              </button>
            </div>

            <div className="kpi-modal-body">
              
              {selectedKpiSubFilter && (
                <div className="kpi-subfilter-bar">
                  <button
                    className="btn-back-kpi"
                    onClick={() => {
                      setSelectedKpiSubFilter(null);
                      setKpiSearchQuery('');
                      setKpiModalPage(1);
                    }}
                  >
                  ← Back to {
                    activeKpiModal === 'city' ? 'Cities Overview'
                    : activeKpiModal === 'category' ? 'Categories Overview'
                    : activeKpiModal === 'avgRating' ? 'Rating Overview'
                    : activeKpiModal === 'coverage' ? 'Coverage Overview'
                    : activeKpiModal === 'open24h' ? '24h Overview'
                    : 'Sources Overview'
                  }
                  </button>
                  <span className="subfilter-tag">
                    Showing listings for: <strong>{selectedKpiSubFilter}</strong>
                  </span>
                </div>
              )}

              {(selectedKpiSubFilter || activeKpiModal === 'listings') && (() => {
                let targetListings = listings;
                if (selectedKpiSubFilter) {
                  if (activeKpiModal === 'city') targetListings = listings.filter((l) => l.city === selectedKpiSubFilter);
                  else if (activeKpiModal === 'category') targetListings = listings.filter((l) => l.category === selectedKpiSubFilter);
                  else if (activeKpiModal === 'source') targetListings = listings.filter((l) => l.source === selectedKpiSubFilter);
                  else if (activeKpiModal === 'avgRating') targetListings = listings.filter((l) => l.city === selectedKpiSubFilter);
                  else if (activeKpiModal === 'coverage') targetListings = listings.filter((l) => l.city === selectedKpiSubFilter);
                  else if (activeKpiModal === 'open24h') targetListings = listings.filter((l) => l.city === selectedKpiSubFilter && l.opening_time === '24 Hours');
                }

                if (kpiSearchQuery.trim()) {
                  const q = kpiSearchQuery.toLowerCase();
                  targetListings = targetListings.filter(
                    (item) =>
                      (item.business_name || '').toLowerCase().includes(q) ||
                      (item.category || '').toLowerCase().includes(q) ||
                      (item.city || '').toLowerCase().includes(q) ||
                      (item.phone || '').toLowerCase().includes(q) ||
                      (item.source || '').toLowerCase().includes(q)
                  );
                }

                const pageSize = 20;
                const totalKpiPages = Math.ceil(targetListings.length / pageSize);
                const paginatedKpiListings = targetListings.slice(
                  (kpiModalPage - 1) * pageSize,
                  kpiModalPage * pageSize
                );

                return (
                  <div>
                    <div className="kpi-modal-summary-bar">
                      <span>Found <strong>{targetListings.length}</strong> matching businesses</span>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>💡 Click any row to view full details</span>
                    </div>

                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Business Name</th>
                            <th>Category</th>
                            <th>City</th>
                            <th>Rating</th>
                            <th>Hours</th>
                            <th>Since</th>
                            <th>Phone</th>
                            <th>Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedKpiListings.map((item) => (
                            <tr
                              key={item.id}
                              className="clickable-row"
                              onClick={() => setSelectedBusiness(item)}
                              title="Click to view full business card"
                            >
                              <td style={{ fontWeight: '600', color: '#f8fafc' }}>{item.business_name}</td>
                              <td><span className="finder-tag finder-tag-category">{item.category}</span></td>
                              <td><span className="finder-tag finder-tag-city">📍 {item.city}</span></td>
                              <td style={{ color: '#f59e0b', fontWeight: '600' }}>⭐ {item.rating}</td>
                              <td style={{ fontSize: '0.825rem' }}>{item.opening_time ? `${item.opening_time} - ${item.closing_time}` : '-'}</td>
                              <td>{item.established_year}</td>
                              <td style={{ fontFamily: 'monospace' }}>{item.phone}</td>
                              <td><span className="source-tag">{item.source}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {totalKpiPages > 1 && (
                      <div className="pagination-buttons" style={{ marginTop: '1rem' }}>
                        {(() => {
                          let pages = [];
                          if (totalKpiPages <= 7) {
                            pages = Array.from({ length: totalKpiPages }, (_, i) => i + 1);
                          } else {
                            if (kpiModalPage <= 4) {
                              pages = [1, 2, 3, 4, 5, '...', totalKpiPages];
                            } else if (kpiModalPage >= totalKpiPages - 3) {
                              pages = [1, '...', totalKpiPages - 4, totalKpiPages - 3, totalKpiPages - 2, totalKpiPages - 1, totalKpiPages];
                            } else {
                              pages = [1, '...', kpiModalPage - 1, kpiModalPage, kpiModalPage + 1, '...', totalKpiPages];
                            }
                          }
                          return pages.map((p, idx) =>
                            p === '...' ? (
                              <span key={`kpi-ellipsis-${idx}`} className="page-ellipsis" style={{ padding: '0 6px', color: '#64748b', alignSelf: 'center' }}>...</span>
                            ) : (
                              <button
                                key={p}
                                className={`page-btn ${p === kpiModalPage ? 'page-btn-active' : ''}`}
                                onClick={() => setKpiModalPage(p)}
                              >
                                {p}
                              </button>
                            )
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })()}

              {activeKpiModal === 'city' && !selectedKpiSubFilter && (() => {
                const filtered = cityBreakdown.filter((c) =>
                  c.city.toLowerCase().includes(kpiSearchQuery.toLowerCase())
                );
                return (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>City Name</th>
                          <th>Total Businesses</th>
                          <th>Market Share (%)</th>
                          <th>Top Category</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((item) => (
                          <tr key={item.city}>
                            <td style={{ fontWeight: '700', color: '#38bdf8', fontSize: '1rem' }}>🏙️ {item.city}</td>
                            <td style={{ fontWeight: '600' }}>{item.count} listings</td>
                            <td style={{ width: '220px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="progress-bar-bg">
                                  <div className="progress-bar-fill fill-cyan" style={{ width: `${item.percentage}%` }}></div>
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: '600', width: '45px' }}>{item.percentage}%</span>
                              </div>
                            </td>
                            <td><span className="finder-tag finder-tag-category">{item.topCategory}</span></td>
                            <td>
                              <button
                                className="btn-kpi-action"
                                onClick={() => {
                                  setSelectedKpiSubFilter(item.city);
                                  setKpiSearchQuery('');
                                  setKpiModalPage(1);
                                }}
                              >
                                View Businesses ({item.count}) →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {activeKpiModal === 'category' && !selectedKpiSubFilter && (() => {
                const filtered = categoryBreakdown.filter((c) =>
                  c.category.toLowerCase().includes(kpiSearchQuery.toLowerCase())
                );
                return (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Category Name</th>
                          <th>Total Registered</th>
                          <th>Share (%)</th>
                          <th>Avg Rating</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((item) => (
                          <tr key={item.category}>
                            <td style={{ fontWeight: '700', color: '#c084fc', fontSize: '1rem' }}>🏷️ {item.category}</td>
                            <td style={{ fontWeight: '600' }}>{item.count} businesses</td>
                            <td style={{ width: '220px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="progress-bar-bg">
                                  <div className="progress-bar-fill fill-purple" style={{ width: `${item.percentage}%` }}></div>
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: '600', width: '45px' }}>{item.percentage}%</span>
                              </div>
                            </td>
                            <td style={{ color: '#f59e0b', fontWeight: '600' }}>⭐ {item.avgRating} / 5.0</td>
                            <td>
                              <button
                                className="btn-kpi-action"
                                onClick={() => {
                                  setSelectedKpiSubFilter(item.category);
                                  setKpiSearchQuery('');
                                  setKpiModalPage(1);
                                }}
                              >
                                View Businesses ({item.count}) →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {activeKpiModal === 'source' && !selectedKpiSubFilter && (() => {
                const filtered = sourceBreakdown.filter((s) =>
                  s.source.toLowerCase().includes(kpiSearchQuery.toLowerCase())
                );
                return (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Platform Source</th>
                          <th>Scraped Records</th>
                          <th>Platform Share (%)</th>
                          <th>Top City</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((item) => (
                          <tr key={item.source}>
                            <td style={{ fontWeight: '700', color: '#facc15', fontSize: '1rem' }}>🌐 {item.source}</td>
                            <td style={{ fontWeight: '600' }}>{item.count} records</td>
                            <td style={{ width: '220px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="progress-bar-bg">
                                  <div className="progress-bar-fill fill-amber" style={{ width: `${item.percentage}%` }}></div>
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: '600', width: '45px' }}>{item.percentage}%</span>
                              </div>
                            </td>
                            <td><span className="finder-tag finder-tag-city">📍 {item.topCity}</span></td>
                            <td>
                              <button
                                className="btn-kpi-action"
                                onClick={() => {
                                  setSelectedKpiSubFilter(item.source);
                                  setKpiSearchQuery('');
                                  setKpiModalPage(1);
                                }}
                              >
                                View Businesses ({item.count}) →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {activeKpiModal === 'avgRating' && !selectedKpiSubFilter && (() => {
                const filtered = extendedMetrics.cityRatingMap.filter((c) =>
                  c.city.toLowerCase().includes(kpiSearchQuery.toLowerCase())
                );
                return (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>City</th>
                          <th>Avg. Rating</th>
                          <th>Rating Bar</th>
                          <th>Businesses Rated</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((item) => {
                          const rVal = parseFloat(item.avgRating);
                          const barColor = rVal >= 4.2 ? '#10b981' : rVal >= 3.8 ? '#06b6d4' : rVal >= 3.5 ? '#f59e0b' : '#ef4444';
                          return (
                            <tr key={item.city}>
                              <td style={{ fontWeight: '700', color: '#38bdf8', fontSize: '1rem' }}>🏙️ {item.city}</td>
                              <td style={{ color: barColor, fontWeight: '700', fontSize: '1.05rem' }}>⭐ {item.avgRating}</td>
                              <td style={{ width: '200px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div className="progress-bar-bg">
                                    <div className="progress-bar-fill" style={{ width: `${(rVal / 5) * 100}%`, background: barColor }}></div>
                                  </div>
                                  <span style={{ fontSize: '0.8rem', fontWeight: '600', width: '38px' }}>{((rVal / 5) * 100).toFixed(0)}%</span>
                                </div>
                              </td>
                              <td style={{ fontWeight: '600' }}>{item.count} rated</td>
                              <td>
                                <button className="btn-kpi-action" onClick={() => { setSelectedKpiSubFilter(item.city); setKpiSearchQuery(''); setKpiModalPage(1); }}>
                                  View Businesses →
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {activeKpiModal === 'highRated' && !selectedKpiSubFilter && (() => {
                const q = kpiSearchQuery.toLowerCase();
                const filtered = extendedMetrics.topRatedBusinesses
                  .concat(listings.filter(l => parseFloat(l.rating) >= 4.5 && !extendedMetrics.topRatedBusinesses.find(t => t.id === l.id)))
                  .filter(l => parseFloat(l.rating) >= 4.5)
                  .filter(l =>
                    !q ||
                    (l.business_name || '').toLowerCase().includes(q) ||
                    (l.city || '').toLowerCase().includes(q) ||
                    (l.category || '').toLowerCase().includes(q)
                  )
                  .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
                const pageSize = 20;
                const totalPages = Math.ceil(filtered.length / pageSize);
                const paged = filtered.slice((kpiModalPage - 1) * pageSize, kpiModalPage * pageSize);
                return (
                  <div>
                    <div className="kpi-modal-summary-bar">
                      <span>Found <strong>{filtered.length}</strong> high-rated businesses (≥ 4.5 ⭐)</span>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>💡 Click any row to view full details</span>
                    </div>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Business Name</th>
                            <th>Category</th>
                            <th>City</th>
                            <th>Rating</th>
                            <th>Since</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paged.map((item, idx) => (
                            <tr key={item.id} className="clickable-row" onClick={() => setSelectedBusiness(item)} title="Click to view business details">
                              <td>
                                <span className="rank-badge" style={{
                                  background: idx === 0 ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' : idx === 1 ? 'linear-gradient(135deg,#94a3b8,#cbd5e1)' : idx === 2 ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'rgba(255,255,255,0.08)',
                                  color: idx < 3 ? '#0f172a' : '#94a3b8',
                                }}>#{(kpiModalPage - 1) * pageSize + idx + 1}</span>
                              </td>
                              <td style={{ fontWeight: '700', color: '#f8fafc' }}>{item.business_name}</td>
                              <td><span className="finder-tag finder-tag-category">{item.category}</span></td>
                              <td><span className="finder-tag finder-tag-city">📍 {item.city}</span></td>
                              <td style={{ color: '#10b981', fontWeight: '700', fontSize: '1.05rem' }}>⭐ {item.rating}</td>
                              <td>{item.established_year || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {totalPages > 1 && (
                      <div className="pagination-buttons" style={{ marginTop: '1rem' }}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                          <button key={p} className={`page-btn ${p === kpiModalPage ? 'page-btn-active' : ''}`} onClick={() => setKpiModalPage(p)}>{p}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {activeKpiModal === 'coverage' && !selectedKpiSubFilter && (() => {
                const q = kpiSearchQuery.toLowerCase();
                const filteredCities = cityBreakdown.filter(c => c.city.toLowerCase().includes(q));
                const filteredCats = categoryBreakdown.filter(c => c.category.toLowerCase().includes(q));
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#38bdf8', marginBottom: '0.75rem' }}>🏙️ Cities ({filteredCities.length})</div>
                      <div className="table-wrapper">
                        <table>
                          <thead><tr><th>City</th><th>Listings</th><th>Share</th><th>Action</th></tr></thead>
                          <tbody>
                            {filteredCities.map(item => (
                              <tr key={item.city}>
                                <td style={{ fontWeight: '700', color: '#38bdf8' }}>🏙️ {item.city}</td>
                                <td style={{ fontWeight: '600' }}>{item.count}</td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <div className="progress-bar-bg" style={{ flex: 1 }}><div className="progress-bar-fill fill-cyan" style={{ width: `${item.percentage}%` }}></div></div>
                                    <span style={{ fontSize: '0.78rem', fontWeight: '600' }}>{item.percentage}%</span>
                                  </div>
                                </td>
                                <td><button className="btn-kpi-action" onClick={() => { setSelectedKpiSubFilter(item.city); setKpiSearchQuery(''); setKpiModalPage(1); }}>View →</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#c084fc', marginBottom: '0.75rem' }}>🏷️ Categories ({filteredCats.length})</div>
                      <div className="table-wrapper">
                        <table>
                          <thead><tr><th>Category</th><th>Listings</th><th>Avg ⭐</th></tr></thead>
                          <tbody>
                            {filteredCats.map(item => (
                              <tr key={item.category}>
                                <td style={{ fontWeight: '700', color: '#c084fc' }}>🏷️ {item.category}</td>
                                <td style={{ fontWeight: '600' }}>{item.count}</td>
                                <td style={{ color: '#f59e0b', fontWeight: '600' }}>{item.avgRating}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {activeKpiModal === 'open24h' && !selectedKpiSubFilter && (() => {
                const q = kpiSearchQuery.toLowerCase();
                const filtered = listings
                  .filter(l => l.opening_time === '24 Hours')
                  .filter(l =>
                    !q ||
                    (l.business_name || '').toLowerCase().includes(q) ||
                    (l.city || '').toLowerCase().includes(q) ||
                    (l.category || '').toLowerCase().includes(q)
                  );
                const pageSize = 20;
                const totalPages = Math.ceil(filtered.length / pageSize);
                const paged = filtered.slice((kpiModalPage - 1) * pageSize, kpiModalPage * pageSize);
                return (
                  <div>
                    <div className="kpi-modal-summary-bar">
                      <span>Found <strong>{filtered.length}</strong> 24-hour businesses</span>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>💡 Click any row to view full details</span>
                    </div>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Business Name</th>
                            <th>Category</th>
                            <th>City</th>
                            <th>Rating</th>
                            <th>Phone</th>
                            <th>Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paged.map((item) => (
                            <tr key={item.id} className="clickable-row" onClick={() => setSelectedBusiness(item)} title="Click to view business details">
                              <td style={{ fontWeight: '700', color: '#f8fafc' }}>{item.business_name}</td>
                              <td><span className="finder-tag finder-tag-category">{item.category}</span></td>
                              <td><span className="finder-tag finder-tag-city">📍 {item.city}</span></td>
                              <td style={{ color: '#f59e0b', fontWeight: '600' }}>⭐ {item.rating || '-'}</td>
                              <td style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{item.phone}</td>
                              <td><span className="source-tag">{item.source}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {totalPages > 1 && (
                      <div className="pagination-buttons" style={{ marginTop: '1rem' }}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                          <button key={p} className={`page-btn ${p === kpiModalPage ? 'page-btn-active' : ''}`} onClick={() => setKpiModalPage(p)}>{p}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {selectedBusiness && (
        <div
          className="modal-overlay modal-overlay-detail"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedBusiness(null);
            }
          }}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-badge">🏢</span>
                <div>
                  <h3 className="modal-business-name">{selectedBusiness.business_name}</h3>
                  <p className="modal-business-sub">
                    {selectedBusiness.category} • {selectedBusiness.city}
                  </p>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedBusiness(null)}
                aria-label="Close details"
              >
                &#10005;
              </button>
            </div>

            <div className="modal-body">
              
              <div className="modal-specs-grid">
                <div className="spec-item">
                  <span className="spec-label">Rating</span>
                  <span className="spec-value spec-rating">⭐ {selectedBusiness.rating || 'N/A'}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Established</span>
                  <span className="spec-value">📅 Since {selectedBusiness.established_year || 'N/A'}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Hours</span>
                  <span className="spec-value spec-hours">🕒 {selectedBusiness.opening_time ? `${selectedBusiness.opening_time} - ${selectedBusiness.closing_time}` : 'N/A'}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Platform Source</span>
                  <span className="spec-value">🌐 {selectedBusiness.source}</span>
                </div>
              </div>

              <div className="modal-info-group">
                <div className="info-row">
                  <span className="info-icon">📞</span>
                  <span><strong>Phone:</strong> {selectedBusiness.phone}</span>
                </div>
                <div className="info-row">
                  <span className="info-icon">📍</span>
                  <span><strong>Address:</strong> {selectedBusiness.address}</span>
                </div>
              </div>

              <div className="modal-about-section">
                <h4>About Us</h4>
                <p>
                  <strong>{selectedBusiness.business_name}</strong> is a trusted business in the <strong>{selectedBusiness.category}</strong> sector based in <strong>{selectedBusiness.city}</strong>. Operating since {selectedBusiness.established_year || 'many years'}, we maintain an outstanding customer rating of <strong>⭐ {selectedBusiness.rating} / 5.0</strong>. Visit us at {selectedBusiness.address} during business hours ({selectedBusiness.opening_time} - {selectedBusiness.closing_time}) or reach us via phone at {selectedBusiness.phone}.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
