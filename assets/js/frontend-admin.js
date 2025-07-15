// Marine World Frontend Admin Panel
(function() {
    'use strict';

    // Prevent multiple initializations
    if (window.MWBFrontendAdminLoaded) {
        return;
    }
    window.MWBFrontendAdminLoaded = true;

    // Check if React is available
    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
        console.error('Marine World Frontend Admin: React is not loaded');
        return;
    }

    const { useState, useEffect, useCallback } = React;
    const { render } = ReactDOM;

    // Modal utilities
    const modalUtils = {
        openModal: function() {
            document.body.classList.add('mwb-modal-open');
            // Ensure modal overlay is visible
            setTimeout(() => {
                const overlay = document.querySelector('.mwb-modal-overlay');
                if (overlay) {
                    overlay.style.display = 'flex';
                    overlay.style.visibility = 'visible';
                    overlay.style.opacity = '1';
                }
            }, 10);
        },
        closeModal: function() {
            document.body.classList.remove('mwb-modal-open');
        }
    };

    // Frontend Admin Manager
    window.MWBFrontendAdmin = {
        instances: {},
        
        init: function(panelId, config) {
            if (!document.getElementById(panelId)) {
                console.error('Frontend Admin Panel container not found:', panelId);
                return;
            }

            // Prevent double initialization
            if (this.instances[panelId] && this.instances[panelId].initialized) {
                console.warn('Frontend Admin Panel already initialized:', panelId);
                return;
            }

            this.instances[panelId] = {
                config: config,
                initialized: false
            };

            console.log('Initializing Frontend Admin Panel:', panelId, config);

            this.initializeTabs(panelId);
            this.initializeReactComponents(panelId, config);
            
            this.instances[panelId].initialized = true;
        },

        initializeTabs: function(panelId) {
            const panel = document.getElementById(panelId);
            if (!panel) {
                console.warn('Frontend Admin Panel not found:', panelId);
                return;
            }

            const tabLinks = panel.querySelectorAll('.nav-tab');
            const tabContents = panel.querySelectorAll('.mwb-tab-content');

            if (tabLinks.length === 0) {
                console.warn('No tab links found in panel:', panelId);
                return;
            }

            tabLinks.forEach(link => {
                if (!link) return; // Skip null links
                
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    const targetTab = this.getAttribute('data-tab');
                    if (!targetTab) return;
                    
                    // Remove active class from all tabs and contents
                    tabLinks.forEach(tab => {
                        if (tab && tab.classList) {
                            tab.classList.remove('nav-tab-active');
                        }
                    });
                    tabContents.forEach(content => {
                        if (content && content.style) {
                            content.style.display = 'none';
                        }
                    });
                    
                    // Add active class to clicked tab
                    if (this.classList) {
                        this.classList.add('nav-tab-active');
                    }
                    
                    // Show target content
                    const targetContent = panel.querySelector('#' + targetTab);
                    if (targetContent) {
                        targetContent.style.display = 'block';
                    }
                    
                    // Initialize React component for this tab if not already done
                    window.MWBFrontendAdmin.initializeTabComponent(panelId, targetTab);
                });
            });
        },

        initializeReactComponents: function(panelId, config) {
            // Initialize default tab component
            this.initializeTabComponent(panelId, config.defaultTab);
        },

        initializeTabComponent: function(panelId, tabName) {
            if (!tabName) {
                console.warn('No tab name provided for initialization');
                return;
            }

            const containerId = `mwb-frontend-${tabName}`;
            const container = document.getElementById(containerId);
            
            if (!container) {
                console.warn('Container not found for tab:', tabName, containerId);
                // Try to find the container within the panel
                const panel = document.getElementById(panelId);
                if (panel) {
                    const alternateContainer = panel.querySelector(`#${containerId}`);
                    if (!alternateContainer) {
                        console.warn('Alternate container also not found in panel:', panelId);
                        return;
                    }
                    // Check if alternate container is already initialized
                    if (alternateContainer.hasAttribute('data-react-initialized')) {
                        console.log('Alternate component already initialized for tab:', tabName);
                        return;
                    }
                    // Mark alternate container as initialized
                    alternateContainer.setAttribute('data-react-initialized', 'true');
                    this.renderReactComponent(alternateContainer, tabName);
                }
                return;
            }

            // Check if already initialized
            if (container.hasAttribute('data-react-initialized')) {
                console.log('Component already initialized for tab:', tabName);
                return;
            }

            // Mark as initialized
            container.setAttribute('data-react-initialized', 'true');
            
            this.renderReactComponent(container, tabName);
        },

        renderReactComponent: function(container, tabName, retryCount = 0) {
            if (!container || !tabName) return;

            // Check if React is available
            if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
                if (retryCount < 5) {
                    console.warn('React or ReactDOM not available for tab:', tabName, 'retry:', retryCount);
                    container.innerHTML = '<p>Loading dependencies... Please wait.</p>';
                    // Retry after a short delay (max 5 retries)
                    setTimeout(() => {
                        this.renderReactComponent(container, tabName, retryCount + 1);
                    }, 500);
                } else {
                    console.error('React or ReactDOM not available after 5 retries for tab:', tabName);
                    container.innerHTML = '<p>Error: Required dependencies not loaded. Please refresh the page.</p>';
                }
                return;
            }

            try {
                // Render appropriate React component
                switch (tabName) {
                    case 'dashboard':
                        render(React.createElement(FrontendDashboard), container);
                        break;
                    case 'bookings':
                        render(React.createElement(FrontendBookingsManagement), container);
                        break;
                    case 'availability':
                        render(React.createElement(FrontendAvailabilityManagement), container);
                        break;
                    case 'analytics':
                        render(React.createElement(FrontendAnalyticsManagement), container);
                        break;
                    case 'settings':
                        render(React.createElement(FrontendSettingsManagement), container);
                        break;
                    case 'addons':
                        render(React.createElement(FrontendAddonsManagement), container);
                        break;
                    case 'locations':
                        render(React.createElement(FrontendLocationsManagement), container);
                        break;
                    case 'promo_codes':
                        render(React.createElement(FrontendPromoCodesManagement), container);
                        break;
                    case 'birthday_offers':
                        render(React.createElement(FrontendBirthdayOffersManagement), container);
                        break;
                    case 'pricing':
                        render(React.createElement(FrontendPricingManagement), container);
                        break;
                    default:
                        container.innerHTML = '<p>Feature "' + tabName + '" is not yet implemented.</p>';
                }
            } catch (error) {
                console.error('Failed to render React component for tab:', tabName, error);
                container.innerHTML = '<p>Error loading ' + tabName + ' component. Please refresh the page.</p>';
            }
        }
    };

    // API Helper for Frontend Admin (reuse existing adminApi but ensure it works on frontend)
    const frontendAdminApi = window.adminApi || {
        async request(action, data = {}) {
            const formData = new FormData();
            formData.append('action', action);
            formData.append('nonce', marineWorldBooking.nonce || '');
            
            Object.keys(data).forEach(key => {
                if (typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key])) {
                    Object.keys(data[key]).forEach(subKey => {
                        formData.append(`${key}[${subKey}]`, data[key][subKey]);
                    });
                } else if (Array.isArray(data[key])) {
                    data[key].forEach(item => formData.append(`${key}[]`, item));
                } else {
                    formData.append(key, data[key]);
                }
            });

            try {
                const response = await fetch(marineWorldBooking.ajaxUrl || '/wp-admin/admin-ajax.php', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.data || 'Request failed');
                }
                
                return result.data;
            } catch (error) {
                console.error('Frontend Admin API Error:', error);
                throw error;
            }
        },

        // Dashboard methods
        getDashboardStats(dateFrom, dateTo) {
            return this.request('mwb_get_dashboard_stats', { date_from: dateFrom, date_to: dateTo });
        },

        // Bookings methods
        getBookingsList(page = 1, perPage = 20, search = '', filters = {}) {
            return this.request('mwb_get_bookings_list', { 
                page, 
                per_page: perPage, 
                search, 
                ...filters 
            });
        },

        // Settings methods
        getSettings() {
            return this.request('mwb_get_settings');
        },

        saveSettings(settings) {
            return this.request('mwb_save_settings', { settings });
        },

        clearAllBookings(confirm) {
            return this.request('mwb_clear_all_bookings', { confirm });
        },

        // Availability methods
        getAvailabilityData(locationId, dateFrom, dateTo) {
            return this.request('mwb_get_availability_data', { 
                location_id: locationId,
                date_from: dateFrom,
                date_to: dateTo 
            });
        },

        updateAvailability(locationId, date, capacity, isBlackout = false, specialPricing = 0) {
            return this.request('mwb_update_availability', {
                location_id: locationId,
                date,
                capacity,
                is_blackout: isBlackout,
                special_pricing: specialPricing
            });
        },

        // Location management methods
        getLocationsList(search = '', status = '') {
            return this.request('mwb_get_locations_list', { search, status });
        },

        getLocation(locationId) {
            return this.request('mwb_get_location', { location_id: locationId });
        },

        saveLocation(locationData) {
            return this.request('mwb_save_location', locationData);
        },

        deleteLocation(locationId) {
            return this.request('mwb_delete_location', { location_id: locationId });
        },

        // Add-ons management methods
        getAddonsList(search = '', status = '') {
            return this.request('mwb_get_addons_list', { search, status });
        },

        getAddon(addonId) {
            return this.request('mwb_get_addon', { addon_id: addonId });
        },

        saveAddon(addonData) {
            return this.request('mwb_save_addon', addonData);
        },

        deleteAddon(addonId) {
            return this.request('mwb_delete_addon', { addon_id: addonId });
        },

        // Promo codes management methods
        getPromoCodesList(search = '', status = '') {
            return this.request('mwb_get_promo_codes_list', { search, status });
        },

        getPromoCode(promoCodeId) {
            return this.request('mwb_get_promo_code', { promo_id: promoCodeId });
        },

        savePromoCode(promoCodeData) {
            return this.request('mwb_save_promo_code', promoCodeData);
        },

        deletePromoCode(promoCodeId) {
            return this.request('mwb_delete_promo_code', { promo_id: promoCodeId });
        },

        // Pricing management methods
        getTicketPrices() {
            return this.request('mwb_get_ticket_prices');
        },

        updateTicketPrices(prices) {
            return this.request('mwb_update_ticket_prices', { prices });
        },

        getBirthdayOffers() {
            return this.request('mwb_get_birthday_offers');
        },

        getBirthdayOffer(id) {
            return this.request('mwb_get_birthday_offer', { id });
        },

        saveBirthdayOffer(data) {
            return this.request('mwb_save_birthday_offer', data);
        },

        deleteBirthdayOffer(id) {
            return this.request('mwb_delete_birthday_offer', { id });
        },

        resetTicketPrices() {
            return this.request('mwb_reset_ticket_prices');
        },

        // Additional methods for exact WordPress admin replication
        bulkActionBookings(bookingIds, action, data = {}) {
            return this.request('mwb_bulk_action_bookings', {
                booking_ids: bookingIds,
                action,
                ...data
            });
        },

        exportBookings(format, filters) {
            return this.request('mwb_export_bookings', { format, ...filters });
        },

        bulkActionLocations(locationIds, action) {
            return this.request('mwb_bulk_action_locations', {
                location_ids: locationIds,
                action
            });
        },

        getLocationStats(locationId, dateFrom, dateTo) {
            return this.request('mwb_get_location_stats', {
                location_id: locationId,
                date_from: dateFrom,
                date_to: dateTo
            });
        },

        bulkActionAddons(addonIds, action) {
            return this.request('mwb_bulk_action_addons', {
                addon_ids: addonIds,
                action
            });
        },

        updateAddonOrder(addonIds) {
            return this.request('mwb_update_addon_order', {
                addon_ids: addonIds
            });
        },

        getAddonStats(addonId, dateFrom, dateTo) {
            return this.request('mwb_get_addon_stats', {
                addon_id: addonId,
                date_from: dateFrom,
                date_to: dateTo
            });
        },

        bulkActionPromoCodes(promoCodeIds, action) {
            return this.request('mwb_bulk_action_promo_codes', {
                promo_ids: promoCodeIds,
                action
            });
        }
    };

    // Utility Functions
    const frontendUtils = {
        formatCurrency(amount) {
            return `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;
        },

        formatDate(date) {
            return new Date(date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        },

        formatDateTime(datetime) {
            return new Date(datetime).toLocaleString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    };

    // Components
    const LoadingSpinner = () => React.createElement('div', { className: 'mwb-admin-loading' },
        React.createElement('div', { className: 'mwb-spinner' }),
        React.createElement('span', null, 'Loading...')
    );

    const StatsCard = ({ title, value, icon, trend, trendValue }) => {
        return React.createElement('div', { className: 'mwb-stats-card' },
            React.createElement('div', { className: 'mwb-stats-header' },
                React.createElement('h3', null, title),
                React.createElement('span', { className: `mwb-stats-icon ${icon}` })
            ),
            React.createElement('div', { className: 'mwb-stats-value' }, value),
            trend && React.createElement('div', { 
                className: `mwb-stats-trend ${trend > 0 ? 'positive' : 'negative'}` 
            },
                React.createElement('span', null, `${trend > 0 ? '+' : ''}${trendValue}`)
            )
        );
    };

    // Dashboard Component (EXACT copy from WordPress admin)
    const FrontendDashboard = () => {
        const [stats, setStats] = useState(null);
        const [loading, setLoading] = useState(true);
        const [dateRange, setDateRange] = useState({
            from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            to: new Date().toISOString().split('T')[0]
        });

        const loadStats = useCallback(async () => {
            try {
                setLoading(true);
                const data = await frontendAdminApi.getDashboardStats(dateRange.from, dateRange.to);
                setStats(data);
            } catch (error) {
                console.error('Failed to load stats:', error);
            } finally {
                setLoading(false);
            }
        }, [dateRange]);

        useEffect(() => {
            loadStats();
        }, [loadStats]);

        if (loading) return React.createElement(LoadingSpinner);

        return React.createElement('div', { className: 'mwb-dashboard' },
            React.createElement('div', { className: 'mwb-dashboard-header' },
                React.createElement('h2', null, 'Dashboard Overview'),
                React.createElement('div', { className: 'mwb-date-filters' },
                    React.createElement('input', {
                        type: 'date',
                        value: dateRange.from,
                        onChange: (e) => setDateRange(prev => ({ ...prev, from: e.target.value }))
                    }),
                    React.createElement('span', null, ' to '),
                    React.createElement('input', {
                        type: 'date',
                        value: dateRange.to,
                        onChange: (e) => setDateRange(prev => ({ ...prev, to: e.target.value }))
                    }),
                    React.createElement('button', {
                        className: 'button button-secondary',
                        onClick: loadStats,
                        style: { marginLeft: '10px' }
                    }, 'Update')
                )
            ),

            React.createElement('div', { className: 'mwb-stats-grid' },
                React.createElement(StatsCard, {
                    title: 'Total Bookings',
                    value: stats?.total_bookings || 0,
                    icon: 'dashicons-calendar-alt',
                    trend: stats?.bookings_trend || 0,
                    trendValue: `${Math.abs(stats?.bookings_trend || 0)}%`
                }),
                React.createElement(StatsCard, {
                    title: 'Total Revenue',
                    value: frontendUtils.formatCurrency(stats?.total_revenue || 0),
                    icon: 'dashicons-money-alt',
                    trend: stats?.revenue_trend || 0,
                    trendValue: `${Math.abs(stats?.revenue_trend || 0)}%`
                }),
                React.createElement(StatsCard, {
                    title: 'Total Tickets',
                    value: stats?.total_tickets || 0,
                    icon: 'dashicons-tickets-alt',
                    trend: stats?.tickets_trend || 0,
                    trendValue: `${Math.abs(stats?.tickets_trend || 0)}%`
                }),
                React.createElement(StatsCard, {
                    title: 'Average Booking Value',
                    value: frontendUtils.formatCurrency(stats?.average_booking_value || 0),
                    icon: 'dashicons-chart-line',
                    trend: stats?.avg_value_trend || 0,
                    trendValue: `${Math.abs(stats?.avg_value_trend || 0)}%`
                })
            ),

            React.createElement('div', { className: 'mwb-dashboard-charts' },
                React.createElement('div', { className: 'mwb-chart-container' },
                    React.createElement('h3', null, 'Booking Trends'),
                    React.createElement('div', { className: 'mwb-chart-placeholder' },
                        React.createElement('p', null, 'Chart visualization will be implemented here')
                    )
                )
            )
        );
    };

    // Frontend Bookings Management Component (EXACT copy from WordPress admin)
    const FrontendBookingsManagement = () => {
        const [bookings, setBookings] = useState([]);
        const [loading, setLoading] = useState(true);
        const [pagination, setPagination] = useState({ current: 1, total: 1, perPage: 20 });
        const [search, setSearch] = useState('');
        const [filters, setFilters] = useState({
            date_from: '',
            date_to: '',
            location_id: '',
            status: ''
        });
        const [selectedBookings, setSelectedBookings] = useState([]);
        const [bulkAction, setBulkAction] = useState('');

        const loadBookings = useCallback(async (page = 1) => {
            try {
                setLoading(true);
                const data = await frontendAdminApi.getBookingsList(page, pagination.perPage, search, filters);
                setBookings(data.bookings);
                setPagination({
                    current: data.current_page,
                    total: data.total_pages,
                    perPage: pagination.perPage
                });
            } catch (error) {
                console.error('Failed to load bookings:', error);
            } finally {
                setLoading(false);
            }
        }, [search, filters, pagination.perPage]);

        const debouncedSearch = useCallback(
            (() => {
                let timeout;
                return () => {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => loadBookings(1), 500);
                };
            })(),
            [loadBookings]
        );

        useEffect(() => {
            debouncedSearch();
        }, [debouncedSearch]);

        const handleBulkAction = async () => {
            if (!bulkAction || selectedBookings.length === 0) return;

            const reason = bulkAction === 'cancel' ? 
                prompt('Please enter cancellation reason:') : '';

            if (bulkAction === 'cancel' && !reason) return;

            try {
                await frontendAdminApi.bulkActionBookings(selectedBookings, bulkAction, { reason });
                setSelectedBookings([]);
                setBulkAction('');
                loadBookings(pagination.current);
                alert('Bulk action completed successfully');
            } catch (error) {
                alert('Bulk action failed: ' + error.message);
            }
        };

        const handleExport = async (format) => {
            try {
                const result = await frontendAdminApi.exportBookings(format, filters);
                if (result.file_url) {
                    window.open(result.file_url, '_blank');
                }
            } catch (error) {
                alert('Export failed: ' + error.message);
            }
        };

        const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;

        return React.createElement('div', { className: 'mwb-bookings-management' }, [
            React.createElement('div', { key: 'header', className: 'mwb-bookings-header' }, [
                React.createElement('div', { key: 'search-filters', className: 'mwb-search-filters' }, [
                    React.createElement('input', {
                        key: 'search',
                        type: 'text',
                        placeholder: 'Search bookings...',
                        value: search,
                        onChange: (e) => setSearch(e.target.value),
                        className: 'mwb-search-input'
                    }),
                    React.createElement('input', {
                        key: 'date-from',
                        type: 'date',
                        value: filters.date_from,
                        onChange: (e) => setFilters(prev => ({ ...prev, date_from: e.target.value })),
                        placeholder: 'From Date'
                    }),
                    React.createElement('input', {
                        key: 'date-to',
                        type: 'date',
                        value: filters.date_to,
                        onChange: (e) => setFilters(prev => ({ ...prev, date_to: e.target.value })),
                        placeholder: 'To Date'
                    }),
                    React.createElement('select', {
                        key: 'status-filter',
                        value: filters.status,
                        onChange: (e) => setFilters(prev => ({ ...prev, status: e.target.value }))
                    }, [
                        React.createElement('option', { key: 'all', value: '' }, 'All Statuses'),
                        React.createElement('option', { key: 'pending', value: 'pending' }, 'Pending'),
                        React.createElement('option', { key: 'confirmed', value: 'confirmed' }, 'Confirmed'),
                        React.createElement('option', { key: 'cancelled', value: 'cancelled' }, 'Cancelled'),
                        React.createElement('option', { key: 'expired', value: 'expired' }, 'Expired')
                    ])
                ]),
                React.createElement('div', { key: 'actions', className: 'mwb-actions-bar' }, [
                    React.createElement('select', {
                        key: 'bulk-action',
                        value: bulkAction,
                        onChange: (e) => setBulkAction(e.target.value)
                    }, [
                        React.createElement('option', { key: 'none', value: '' }, 'Bulk Actions'),
                        React.createElement('option', { key: 'confirm', value: 'confirm' }, 'Confirm'),
                        React.createElement('option', { key: 'cancel', value: 'cancel' }, 'Cancel'),
                        React.createElement('option', { key: 'delete', value: 'delete' }, 'Delete')
                    ]),
                    React.createElement('button', {
                        key: 'apply',
                        className: 'button',
                        onClick: handleBulkAction,
                        disabled: !bulkAction || selectedBookings.length === 0
                    }, 'Apply'),
                    React.createElement('button', {
                        key: 'export-csv',
                        className: 'button',
                        onClick: () => handleExport('csv')
                    }, 'Export CSV'),
                    React.createElement('button', {
                        key: 'export-excel',
                        className: 'button',
                        onClick: () => handleExport('xlsx')
                    }, 'Export Excel')
                ])
            ]),

            loading ? React.createElement('div', { key: 'loading', className: 'mwb-loading' }, 'Loading bookings...') :
            React.createElement('div', { key: 'table-container', className: 'mwb-table-container' }, [
                React.createElement('table', { key: 'table', className: 'widefat striped' }, [
                    React.createElement('thead', { key: 'head' }, [
                        React.createElement('tr', { key: 'header' }, [
                            React.createElement('th', { key: 'select', className: 'check-column' }, [
                                React.createElement('input', {
                                    key: 'select-all',
                                    type: 'checkbox',
                                    onChange: (e) => {
                                        if (e.target.checked) {
                                            setSelectedBookings(bookings.map(b => b.id));
                                        } else {
                                            setSelectedBookings([]);
                                        }
                                    },
                                    checked: selectedBookings.length === bookings.length && bookings.length > 0
                                })
                            ]),
                            React.createElement('th', { key: 'id' }, 'Booking ID'),
                            React.createElement('th', { key: 'customer' }, 'Customer'),
                            React.createElement('th', { key: 'visit-date' }, 'Visit Date'),
                            React.createElement('th', { key: 'tickets' }, 'Tickets'),
                            React.createElement('th', { key: 'amount' }, 'Amount'),
                            React.createElement('th', { key: 'payment' }, 'Payment'),
                            React.createElement('th', { key: 'status' }, 'Status'),
                            React.createElement('th', { key: 'created' }, 'Created'),
                            React.createElement('th', { key: 'actions' }, 'Actions')
                        ])
                    ]),
                    React.createElement('tbody', { key: 'body' },
                        bookings.length > 0 ? bookings.map(booking =>
                            React.createElement('tr', { key: booking.id }, [
                                React.createElement('td', { key: 'select' }, [
                                    React.createElement('input', {
                                        key: 'checkbox',
                                        type: 'checkbox',
                                        checked: selectedBookings.includes(booking.id),
                                        onChange: (e) => {
                                            if (e.target.checked) {
                                                setSelectedBookings(prev => [...prev, booking.id]);
                                            } else {
                                                setSelectedBookings(prev => prev.filter(id => id !== booking.id));
                                            }
                                        }
                                    })
                                ]),
                                React.createElement('td', { key: 'id' }, [
                                    React.createElement('strong', { key: 'booking-id' }, booking.booking_id)
                                ]),
                                React.createElement('td', { key: 'customer' }, [
                                    React.createElement('div', { key: 'name' }, booking.customer_name),
                                    React.createElement('div', { key: 'email', className: 'mwb-meta' }, booking.customer_email),
                                    React.createElement('div', { key: 'phone', className: 'mwb-meta' }, booking.customer_phone)
                                ]),
                                React.createElement('td', { key: 'visit-date' }, booking.visit_date),
                                React.createElement('td', { key: 'tickets' }, [
                                    React.createElement('div', { key: 'general' }, `General: ${booking.general_tickets || 0}`),
                                    React.createElement('div', { key: 'child' }, `Child: ${booking.child_tickets || 0}`),
                                    React.createElement('div', { key: 'senior' }, `Senior: ${booking.senior_tickets || 0}`)
                                ]),
                                React.createElement('td', { key: 'amount' }, formatCurrency(booking.total_amount)),
                                React.createElement('td', { key: 'payment' }, [
                                    React.createElement('span', {
                                        key: 'payment-status',
                                        className: `status-badge status-${booking.payment_status}`
                                    }, booking.payment_status),
                                    booking.payment_id && React.createElement('div', { key: 'payment-id', className: 'mwb-meta' }, `ID: ${booking.payment_id}`)
                                ]),
                                React.createElement('td', { key: 'status' }, [
                                    React.createElement('span', {
                                        key: 'booking-status',
                                        className: `status-badge status-${booking.booking_status}`
                                    }, booking.booking_status)
                                ]),
                                React.createElement('td', { key: 'created' }, new Date(booking.created_at).toLocaleDateString()),
                                React.createElement('td', { key: 'actions' }, [
                                    React.createElement('button', {
                                        key: 'view',
                                        className: 'button button-small',
                                        onClick: () => alert(`View booking ${booking.booking_id}`)
                                    }, 'View'),
                                    React.createElement('button', {
                                        key: 'edit',
                                        className: 'button button-small',
                                        onClick: () => alert(`Edit booking ${booking.booking_id}`),
                                        style: { marginLeft: '5px' }
                                    }, 'Edit')
                                ])
                            ])
                        ) : [
                            React.createElement('tr', { key: 'no-data' }, [
                                React.createElement('td', { key: 'msg', colSpan: 10, style: { textAlign: 'center', padding: '40px' } }, 'No bookings found.')
                            ])
                        ]
                    )
                ]),

                React.createElement('div', { key: 'pagination', className: 'mwb-pagination' }, [
                    React.createElement('span', { key: 'info' }, `Page ${pagination.current} of ${pagination.total}`),
                    React.createElement('div', { key: 'controls' }, [
                        React.createElement('button', {
                            key: 'prev',
                            className: 'button',
                            disabled: pagination.current <= 1,
                            onClick: () => loadBookings(pagination.current - 1)
                        }, 'Previous'),
                        React.createElement('button', {
                            key: 'next',
                            className: 'button',
                            disabled: pagination.current >= pagination.total,
                            onClick: () => loadBookings(pagination.current + 1)
                        }, 'Next')
                    ])
                ])
            ])
        ]);
    };

    // Frontend Analytics Component (full implementation)
    const FrontendAnalyticsManagement = () => {
        const [analytics, setAnalytics] = useState(null);
        const [bookings, setBookings] = useState([]);
        const [loading, setLoading] = useState(true);
        const [activeTab, setActiveTab] = useState('overview');
        const [dateRange, setDateRange] = useState({
            from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            to: new Date().toISOString().split('T')[0]
        });

        const loadAnalytics = useCallback(async () => {
            setLoading(true);
            try {
                const [analyticsData, bookingsData] = await Promise.all([
                    frontendAdminApi.getDashboardStats(dateRange.from, dateRange.to),
                    frontendAdminApi.getBookingsList(1, 100, '', { 
                        date_from: dateRange.from, 
                        date_to: dateRange.to 
                    })
                ]);
                setAnalytics(analyticsData);
                setBookings(bookingsData.bookings || []);
            } catch (error) {
                console.error('Failed to load analytics:', error);
            } finally {
                setLoading(false);
            }
        }, [dateRange]);

        useEffect(() => {
            loadAnalytics();
        }, [loadAnalytics]);

        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(amount || 0);
        };

        const StatCard = ({ title, value, icon, color = '#007cba' }) => {
            return React.createElement('div', {
                className: 'mwb-stat-card',
                style: {
                    background: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    borderLeft: `4px solid ${color}`,
                    marginBottom: '20px'
                }
            }, [
                React.createElement('div', {
                    key: 'header',
                    style: { display: 'flex', alignItems: 'center', marginBottom: '10px' }
                }, [
                    React.createElement('span', {
                        key: 'icon',
                        style: {
                            fontSize: '24px',
                            marginRight: '10px',
                            color: color
                        }
                    }, icon),
                    React.createElement('h3', {
                        key: 'title',
                        style: { margin: 0, color: '#333', fontSize: '16px' }
                    }, title)
                ]),
                React.createElement('div', {
                    key: 'value',
                    style: { fontSize: '28px', fontWeight: 'bold', color: '#333' }
                }, value)
            ]);
        };

        const calculateAnalytics = () => {
            if (!bookings.length) return {};
            
            const dailyStats = {};
            bookings.forEach(booking => {
                const date = booking.visit_date;
                if (!dailyStats[date]) {
                    dailyStats[date] = { bookings: 0, revenue: 0, tickets: 0 };
                }
                dailyStats[date].bookings++;
                dailyStats[date].revenue += parseFloat(booking.total_amount || 0);
                dailyStats[date].tickets += parseInt(booking.total_tickets || 0);
            });

            const paymentMethods = {};
            bookings.forEach(booking => {
                const method = booking.payment_method || 'Unknown';
                paymentMethods[method] = (paymentMethods[method] || 0) + 1;
            });

            return { dailyStats, paymentMethods };
        };

        const analyticsData = calculateAnalytics();

        const exportData = () => {
            const csvContent = [
                ['Booking ID', 'Customer Email', 'Visit Date', 'Total Amount', 'Status', 'Created Date'],
                ...bookings.map(booking => [
                    booking.id,
                    booking.customer_email,
                    booking.visit_date,
                    booking.total_amount,
                    booking.booking_status,
                    booking.created_at
                ])
            ].map(row => row.join(',')).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `bookings-${dateRange.from}-to-${dateRange.to}.csv`;
            link.click();
        };

        if (loading) {
            return React.createElement('div', {
                style: { display: 'flex', justifyContent: 'center', padding: '50px' }
            }, 'Loading analytics...');
        }

        return React.createElement('div', { className: 'mwb-frontend-analytics' }, [
            React.createElement('div', {
                key: 'header',
                style: { marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
            }, [
                React.createElement('div', { key: 'date-controls', style: { display: 'flex', gap: '10px', alignItems: 'center' } }, [
                    React.createElement('label', { key: 'from-label' }, 'From:'),
                    React.createElement('input', {
                        key: 'from-date',
                        type: 'date',
                        value: dateRange.from,
                        onChange: (e) => setDateRange(prev => ({ ...prev, from: e.target.value }))
                    }),
                    React.createElement('label', { key: 'to-label' }, 'To:'),
                    React.createElement('input', {
                        key: 'to-date',
                        type: 'date',
                        value: dateRange.to,
                        onChange: (e) => setDateRange(prev => ({ ...prev, to: e.target.value }))
                    }),
                    React.createElement('button', {
                        key: 'refresh',
                        className: 'button button-secondary',
                        onClick: loadAnalytics
                    }, 'Refresh'),
                    React.createElement('button', {
                        key: 'export',
                        className: 'button button-primary',
                        onClick: exportData,
                        style: { marginLeft: '10px' }
                    }, 'Export CSV')
                ])
            ]),

            React.createElement('div', {
                key: 'tabs',
                className: 'nav-tab-wrapper',
                style: { marginBottom: '20px' }
            }, [
                React.createElement('a', {
                    key: 'overview',
                    href: '#overview',
                    className: `nav-tab ${activeTab === 'overview' ? 'nav-tab-active' : ''}`,
                    onClick: (e) => { e.preventDefault(); setActiveTab('overview'); }
                }, 'Overview'),
                React.createElement('a', {
                    key: 'trends',
                    href: '#trends',
                    className: `nav-tab ${activeTab === 'trends' ? 'nav-tab-active' : ''}`,
                    onClick: (e) => { e.preventDefault(); setActiveTab('trends'); }
                }, 'Daily Trends'),
                React.createElement('a', {
                    key: 'reports',
                    href: '#reports',
                    className: `nav-tab ${activeTab === 'reports' ? 'nav-tab-active' : ''}`,
                    onClick: (e) => { e.preventDefault(); setActiveTab('reports'); }
                }, 'Reports')
            ]),

            activeTab === 'overview' && React.createElement('div', {
                key: 'overview',
                style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '20px'
                }
            }, [
                React.createElement(StatCard, {
                    key: 'total-bookings',
                    title: 'Total Bookings',
                    value: analytics?.total_bookings || 0,
                    icon: '📅',
                    color: '#007cba'
                }),
                React.createElement(StatCard, {
                    key: 'total-revenue',
                    title: 'Total Revenue',
                    value: formatCurrency(analytics?.total_revenue),
                    icon: '💰',
                    color: '#28a745'
                }),
                React.createElement(StatCard, {
                    key: 'total-tickets',
                    title: 'Total Tickets',
                    value: analytics?.total_tickets || 0,
                    icon: '🎫',
                    color: '#17a2b8'
                }),
                React.createElement(StatCard, {
                    key: 'avg-booking',
                    title: 'Avg. Booking Value',
                    value: formatCurrency(analytics?.average_booking_value),
                    icon: '📊',
                    color: '#ffc107'
                })
            ]),

            activeTab === 'trends' && React.createElement('div', { key: 'trends' }, [
                React.createElement('h3', { key: 'title' }, 'Daily Trends'),
                React.createElement('div', {
                    key: 'trends-table',
                    style: { background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }
                }, [
                    React.createElement('table', {
                        key: 'table',
                        style: { width: '100%', borderCollapse: 'collapse' }
                    }, [
                        React.createElement('thead', { key: 'head' },
                            React.createElement('tr', { key: 'header' }, [
                                React.createElement('th', { key: 'date', style: { padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'left' } }, 'Date'),
                                React.createElement('th', { key: 'bookings', style: { padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'left' } }, 'Bookings'),
                                React.createElement('th', { key: 'revenue', style: { padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'left' } }, 'Revenue'),
                                React.createElement('th', { key: 'tickets', style: { padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'left' } }, 'Tickets')
                            ])
                        ),
                        React.createElement('tbody', { key: 'body' },
                            Object.entries(analyticsData.dailyStats || {}).map(([date, stats]) =>
                                React.createElement('tr', { key: date }, [
                                    React.createElement('td', { key: 'date', style: { padding: '10px', borderBottom: '1px solid #eee' } }, date),
                                    React.createElement('td', { key: 'bookings', style: { padding: '10px', borderBottom: '1px solid #eee' } }, stats.bookings),
                                    React.createElement('td', { key: 'revenue', style: { padding: '10px', borderBottom: '1px solid #eee' } }, formatCurrency(stats.revenue)),
                                    React.createElement('td', { key: 'tickets', style: { padding: '10px', borderBottom: '1px solid #eee' } }, stats.tickets)
                                ])
                            )
                        )
                    ])
                ])
            ]),

            activeTab === 'reports' && React.createElement('div', { key: 'reports' }, [
                React.createElement('h3', { key: 'title' }, 'Payment Methods Report'),
                React.createElement('div', {
                    key: 'payment-methods',
                    style: { background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }
                }, 
                    Object.entries(analyticsData.paymentMethods || {}).map(([method, count]) =>
                        React.createElement('div', {
                            key: method,
                            style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }
                        }, [
                            React.createElement('span', { key: 'method' }, method),
                            React.createElement('span', { key: 'count' }, count)
                        ])
                    )
                )
            ])
        ]);
    };


    // Frontend Settings Management Component (EXACT WordPress admin copy)
    const FrontendSettingsManagement = () => {
        const [settings, setSettings] = useState({
            // General Settings
            mwb_default_capacity: 1000,
            mwb_max_advance_booking_days: 60,
            mwb_group_discount_15: 5,
            mwb_group_discount_30: 10,
            
            // Payment Settings
            mwb_icici_merchant_id: '',
            mwb_icici_access_code: '',
            mwb_icici_working_key: '',
            mwb_icici_test_mode: 'no',
            
            // Notification Settings
            mwb_email_from_name: 'Marine World',
            mwb_email_from_address: 'noreply@marineworld.in',
            mwb_sms_provider: 'none',
            mwb_textlocal_username: '',
            mwb_textlocal_hash: '',
            mwb_msg91_authkey: '',
            mwb_whatsapp_enabled: 'no',
            
            // Advanced Settings
            mwb_debug_mode: 'no',
            mwb_cache_duration: 300
        });
        const [loading, setLoading] = useState(true);
        const [saving, setSaving] = useState(false);
        const [activeTab, setActiveTab] = useState('general');
        const [message, setMessage] = useState({ type: '', text: '' });

        const loadSettings = useCallback(async () => {
            setLoading(true);
            try {
                const data = await frontendAdminApi.getSettings();
                setSettings(prevSettings => ({ ...prevSettings, ...data }));
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setLoading(false);
            }
        }, []);

        useEffect(() => {
            loadSettings();
        }, [loadSettings]);

        const updateSetting = (key, value) => {
            setSettings(prev => ({ ...prev, [key]: value }));
        };

        const saveSettings = async () => {
            setSaving(true);
            try {
                await frontendAdminApi.saveSettings(settings);
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            } catch (error) {
                setMessage({ type: 'error', text: 'Failed to save settings: ' + error.message });
            } finally {
                setSaving(false);
            }
        };

        if (loading) {
            return React.createElement('div', { className: 'mwb-loading' }, 'Loading settings...');
        }

        return React.createElement('div', { className: 'mwb-frontend-settings' }, [
            React.createElement('h1', { key: 'title', style: { marginBottom: '20px' } }, 'Marine World Booking Settings'),
            
            // Tab Navigation
            React.createElement('nav', { key: 'nav', className: 'nav-tab-wrapper', style: { marginBottom: '20px' } }, [
                React.createElement('a', {
                    key: 'general',
                    href: '#general',
                    className: `nav-tab ${activeTab === 'general' ? 'nav-tab-active' : ''}`,
                    onClick: (e) => { e.preventDefault(); setActiveTab('general'); }
                }, 'General'),
                React.createElement('a', {
                    key: 'payment',
                    href: '#payment',
                    className: `nav-tab ${activeTab === 'payment' ? 'nav-tab-active' : ''}`,
                    onClick: (e) => { e.preventDefault(); setActiveTab('payment'); }
                }, 'Payment'),
                React.createElement('a', {
                    key: 'notifications',
                    href: '#notifications',
                    className: `nav-tab ${activeTab === 'notifications' ? 'nav-tab-active' : ''}`,
                    onClick: (e) => { e.preventDefault(); setActiveTab('notifications'); }
                }, 'Notifications'),
                React.createElement('a', {
                    key: 'advanced',
                    href: '#advanced',
                    className: `nav-tab ${activeTab === 'advanced' ? 'nav-tab-active' : ''}`,
                    onClick: (e) => { e.preventDefault(); setActiveTab('advanced'); }
                }, 'Advanced')
            ]),

            // Message
            message.text && React.createElement('div', {
                key: 'message',
                className: `notice notice-${message.type}`,
                style: { margin: '20px 0', padding: '10px', backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da', border: '1px solid ' + (message.type === 'success' ? '#c3e6cb' : '#f5c6cb'), borderRadius: '4px' }
            }, message.text),

            // Tab Content
            React.createElement('div', { key: 'content', className: 'mwb-tab-content' }, [
                // General Settings Tab
                activeTab === 'general' && React.createElement('div', { key: 'general' }, [
                    React.createElement('h2', { key: 'title' }, 'General Settings'),
                    React.createElement('table', { key: 'table', className: 'form-table' }, [
                        React.createElement('tbody', { key: 'tbody' }, [
                            React.createElement('tr', { key: 'capacity' }, [
                                React.createElement('th', { key: 'label', scope: 'row' }, 'Default Capacity'),
                                React.createElement('td', { key: 'input' }, [
                                    React.createElement('input', {
                                        type: 'number',
                                        value: settings.mwb_default_capacity || 1000,
                                        onChange: (e) => updateSetting('mwb_default_capacity', parseInt(e.target.value) || 1000),
                                        min: '1',
                                        style: { width: '100px' }
                                    }),
                                    React.createElement('p', { className: 'description' }, 'Default daily capacity for new locations')
                                ])
                            ]),
                            React.createElement('tr', { key: 'advance_days' }, [
                                React.createElement('th', { key: 'label', scope: 'row' }, 'Max Advance Booking Days'),
                                React.createElement('td', { key: 'input' }, [
                                    React.createElement('input', {
                                        type: 'number',
                                        value: settings.mwb_max_advance_booking_days || 60,
                                        onChange: (e) => updateSetting('mwb_max_advance_booking_days', parseInt(e.target.value) || 60),
                                        min: '1',
                                        max: '365',
                                        style: { width: '100px' }
                                    }),
                                    React.createElement('p', { className: 'description' }, 'Maximum days in advance customers can book')
                                ])
                            ]),
                            React.createElement('tr', { key: 'group_15' }, [
                                React.createElement('th', { key: 'label', scope: 'row' }, 'Group Discount (15+ people)'),
                                React.createElement('td', { key: 'input' }, [
                                    React.createElement('input', {
                                        type: 'number',
                                        value: settings.mwb_group_discount_15 || 5,
                                        onChange: (e) => updateSetting('mwb_group_discount_15', parseFloat(e.target.value) || 5),
                                        min: '0',
                                        max: '100',
                                        step: '0.1',
                                        style: { width: '100px' }
                                    }),
                                    React.createElement('span', null, '%'),
                                    React.createElement('p', { className: 'description' }, 'Discount percentage for groups of 15 or more')
                                ])
                            ]),
                            React.createElement('tr', { key: 'group_30' }, [
                                React.createElement('th', { key: 'label', scope: 'row' }, 'Group Discount (30+ people)'),
                                React.createElement('td', { key: 'input' }, [
                                    React.createElement('input', {
                                        type: 'number',
                                        value: settings.mwb_group_discount_30 || 10,
                                        onChange: (e) => updateSetting('mwb_group_discount_30', parseFloat(e.target.value) || 10),
                                        min: '0',
                                        max: '100',
                                        step: '0.1',
                                        style: { width: '100px' }
                                    }),
                                    React.createElement('span', null, '%'),
                                    React.createElement('p', { className: 'description' }, 'Discount percentage for groups of 30 or more')
                                ])
                            ])
                        ])
                    ])
                ]),

                // Payment Settings Tab
                activeTab === 'payment' && React.createElement('div', { key: 'payment' }, [
                    React.createElement('h2', { key: 'title' }, 'Payment Gateway Settings'),
                    React.createElement('table', { key: 'table', className: 'form-table' }, [
                        React.createElement('tbody', { key: 'tbody' }, [
                            React.createElement('tr', { key: 'merchant_id' }, [
                                React.createElement('th', { key: 'label', scope: 'row' }, 'ICICI Merchant ID'),
                                React.createElement('td', { key: 'input' }, [
                                    React.createElement('input', {
                                        type: 'text',
                                        value: settings.mwb_icici_merchant_id || '',
                                        onChange: (e) => updateSetting('mwb_icici_merchant_id', e.target.value),
                                        className: 'regular-text'
                                    })
                                ])
                            ]),
                            React.createElement('tr', { key: 'access_code' }, [
                                React.createElement('th', { key: 'label', scope: 'row' }, 'ICICI Access Code'),
                                React.createElement('td', { key: 'input' }, [
                                    React.createElement('input', {
                                        type: 'text',
                                        value: settings.mwb_icici_access_code || '',
                                        onChange: (e) => updateSetting('mwb_icici_access_code', e.target.value),
                                        className: 'regular-text'
                                    })
                                ])
                            ]),
                            React.createElement('tr', { key: 'working_key' }, [
                                React.createElement('th', { key: 'label', scope: 'row' }, 'ICICI Working Key'),
                                React.createElement('td', { key: 'input' }, [
                                    React.createElement('input', {
                                        type: 'password',
                                        value: settings.mwb_icici_working_key || '',
                                        onChange: (e) => updateSetting('mwb_icici_working_key', e.target.value),
                                        className: 'regular-text'
                                    })
                                ])
                            ]),
                            React.createElement('tr', { key: 'test_mode' }, [
                                React.createElement('th', { key: 'label', scope: 'row' }, 'Test Mode'),
                                React.createElement('td', { key: 'input' }, [
                                    React.createElement('label', null, [
                                        React.createElement('input', {
                                            key: 'checkbox',
                                            type: 'checkbox',
                                            checked: settings.mwb_icici_test_mode === 'yes',
                                            onChange: (e) => updateSetting('mwb_icici_test_mode', e.target.checked ? 'yes' : 'no')
                                        }),
                                        React.createElement('span', { key: 'text' }, ' Enable test mode')
                                    ]),
                                    React.createElement('p', { className: 'description' }, 'Use test environment for payments')
                                ])
                            ])
                        ])
                    ])
                ]),

                // Notifications Settings Tab  
                activeTab === 'notifications' && React.createElement('div', { key: 'notifications' }, [
                    React.createElement('h2', { key: 'title' }, 'Notification Settings'),
                    React.createElement('table', { key: 'table', className: 'form-table' }, [
                        React.createElement('tbody', { key: 'tbody' }, [
                            React.createElement('tr', { key: 'email_name' }, [
                                React.createElement('th', { key: 'label', scope: 'row' }, 'Email From Name'),
                                React.createElement('td', { key: 'input' }, [
                                    React.createElement('input', {
                                        type: 'text',
                                        value: settings.mwb_email_from_name || 'Marine World',
                                        onChange: (e) => updateSetting('mwb_email_from_name', e.target.value),
                                        className: 'regular-text'
                                    })
                                ])
                            ]),
                            React.createElement('tr', { key: 'email_address' }, [
                                React.createElement('th', { key: 'label', scope: 'row' }, 'Email From Address'),
                                React.createElement('td', { key: 'input' }, [
                                    React.createElement('input', {
                                        type: 'email',
                                        value: settings.mwb_email_from_address || 'noreply@marineworld.in',
                                        onChange: (e) => updateSetting('mwb_email_from_address', e.target.value),
                                        className: 'regular-text'
                                    })
                                ])
                            ]),
                            React.createElement('tr', { key: 'sms_provider' }, [
                                React.createElement('th', { key: 'label', scope: 'row' }, 'SMS Provider'),
                                React.createElement('td', { key: 'input' }, [
                                    React.createElement('select', {
                                        value: settings.mwb_sms_provider || 'none',
                                        onChange: (e) => updateSetting('mwb_sms_provider', e.target.value)
                                    }, [
                                        React.createElement('option', { key: 'none', value: 'none' }, 'None'),
                                        React.createElement('option', { key: 'textlocal', value: 'textlocal' }, 'Textlocal'),
                                        React.createElement('option', { key: 'msg91', value: 'msg91' }, 'MSG91'),
                                        React.createElement('option', { key: 'twilio', value: 'twilio' }, 'Twilio')
                                    ])
                                ])
                            ]),
                            settings.mwb_sms_provider === 'textlocal' && React.createElement('tr', { key: 'textlocal_username' }, [
                                React.createElement('th', { key: 'label', scope: 'row' }, 'Textlocal Username'),
                                React.createElement('td', { key: 'input' }, [
                                    React.createElement('input', {
                                        type: 'text',
                                        value: settings.mwb_textlocal_username || '',
                                        onChange: (e) => updateSetting('mwb_textlocal_username', e.target.value),
                                        className: 'regular-text'
                                    })
                                ])
                            ]),
                            settings.mwb_sms_provider === 'textlocal' && React.createElement('tr', { key: 'textlocal_hash' }, [
                                React.createElement('th', { key: 'label', scope: 'row' }, 'Textlocal Hash'),
                                React.createElement('td', { key: 'input' }, [
                                    React.createElement('input', {
                                        type: 'password',
                                        value: settings.mwb_textlocal_hash || '',
                                        onChange: (e) => updateSetting('mwb_textlocal_hash', e.target.value),
                                        className: 'regular-text'
                                    })
                                ])
                            ]),
                            settings.mwb_sms_provider === 'msg91' && React.createElement('tr', { key: 'msg91_authkey' }, [
                                React.createElement('th', { key: 'label', scope: 'row' }, 'MSG91 Auth Key'),
                                React.createElement('td', { key: 'input' }, [
                                    React.createElement('input', {
                                        type: 'password',
                                        value: settings.mwb_msg91_authkey || '',
                                        onChange: (e) => updateSetting('mwb_msg91_authkey', e.target.value),
                                        className: 'regular-text'
                                    })
                                ])
                            ]),
                            React.createElement('tr', { key: 'whatsapp' }, [
                                React.createElement('th', { key: 'label', scope: 'row' }, 'WhatsApp Notifications'),
                                React.createElement('td', { key: 'input' }, [
                                    React.createElement('label', null, [
                                        React.createElement('input', {
                                            key: 'checkbox',
                                            type: 'checkbox',
                                            checked: settings.mwb_whatsapp_enabled === 'yes',
                                            onChange: (e) => updateSetting('mwb_whatsapp_enabled', e.target.checked ? 'yes' : 'no')
                                        }),
                                        React.createElement('span', { key: 'text' }, ' Enable WhatsApp notifications')
                                    ])
                                ])
                            ])
                        ])
                    ])
                ]),

                // Advanced Settings Tab
                activeTab === 'advanced' && React.createElement('div', { key: 'advanced' }, [
                    React.createElement('h2', { key: 'title' }, 'Advanced Settings'),
                    React.createElement('table', { key: 'table', className: 'form-table' }, [
                        React.createElement('tbody', { key: 'tbody' }, [
                            React.createElement('tr', { key: 'debug_mode' }, [
                                React.createElement('th', { key: 'label', scope: 'row' }, 'Debug Mode'),
                                React.createElement('td', { key: 'input' }, [
                                    React.createElement('label', null, [
                                        React.createElement('input', {
                                            key: 'checkbox',
                                            type: 'checkbox',
                                            checked: settings.mwb_debug_mode === 'yes',
                                            onChange: (e) => updateSetting('mwb_debug_mode', e.target.checked ? 'yes' : 'no')
                                        }),
                                        React.createElement('span', { key: 'text' }, ' Enable debug logging')
                                    ]),
                                    React.createElement('p', { className: 'description' }, 'Log detailed information for troubleshooting')
                                ])
                            ]),
                            React.createElement('tr', { key: 'cache_duration' }, [
                                React.createElement('th', { key: 'label', scope: 'row' }, 'Cache Duration'),
                                React.createElement('td', { key: 'input' }, [
                                    React.createElement('input', {
                                        type: 'number',
                                        value: settings.mwb_cache_duration || 300,
                                        onChange: (e) => updateSetting('mwb_cache_duration', parseInt(e.target.value) || 300),
                                        min: '60',
                                        max: '3600',
                                        style: { width: '100px' }
                                    }),
                                    React.createElement('span', null, ' seconds'),
                                    React.createElement('p', { className: 'description' }, 'How long to cache availability data')
                                ])
                            ])
                        ])
                    ])
                ])
            ]),

            // Save Button
            React.createElement('div', { key: 'save', style: { marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #ddd' } },
                React.createElement('button', {
                    className: 'button button-primary button-large',
                    onClick: saveSettings,
                    disabled: saving
                }, saving ? 'Saving...' : 'Save Settings')
            )
        ]);
    };

    // Frontend Promo Codes Management Component (full implementation)
    const FrontendPromoCodesManagement = () => {
        const [promoCodes, setPromoCodes] = useState([]);
        const [loading, setLoading] = useState(true);
        const [showModal, setShowModal] = useState(false);
        const [editingPromo, setEditingPromo] = useState(null);
        const [searchTerm, setSearchTerm] = useState('');
        
        const [promoFormData, setPromoFormData] = useState({
            code: '',
            discount_type: 'percentage',
            discount_value: '',
            min_amount: '',
            valid_from: '',
            valid_until: '',
            usage_limit: '',
            status: 'active',
            description: ''
        });

        const loadPromoCodes = useCallback(async () => {
            setLoading(true);
            try {
                const data = await frontendAdminApi.getPromoCodesList(searchTerm);
                setPromoCodes(data.promo_codes || []);
            } catch (error) {
                console.error('Failed to load promo codes:', error);
            } finally {
                setLoading(false);
            }
        }, [searchTerm]);

        useEffect(() => {
            loadPromoCodes();
        }, [loadPromoCodes]);

        const handleDelete = async (id) => {
            if (confirm('Are you sure you want to delete this promo code?')) {
                try {
                    await frontendAdminApi.deletePromoCode(id);
                    loadPromoCodes();
                } catch (error) {
                    console.error('Failed to delete promo code:', error);
                }
            }
        };

        const handleEditPromo = async (promoId) => {
            try {
                const promo = await frontendAdminApi.getPromoCode(promoId);
                setEditingPromo(promoId);
                setPromoFormData(promo);
                setShowModal(true);
                // Ensure modal opens properly
                setTimeout(() => modalUtils.openModal(), 50);
            } catch (error) {
                alert('Failed to load promo code details: ' + error.message);
            }
        };

        const handleSavePromo = async () => {
            try {
                if (editingPromo) {
                    await frontendAdminApi.savePromoCode({ ...promoFormData, id: editingPromo });
                    alert('Promo code updated successfully');
                } else {
                    await frontendAdminApi.savePromoCode(promoFormData);
                    alert('Promo code created successfully');
                }
                setShowModal(false);
                setPromoFormData({
                    code: '',
                    discount_type: 'percentage',
                    discount_value: '',
                    min_amount: '',
                    valid_from: '',
                    valid_until: '',
                    usage_limit: '',
                    status: 'active',
                    description: ''
                });
                loadPromoCodes();
            } catch (error) {
                alert('Failed to save promo code: ' + error.message);
            }
        };

        if (loading) {
            return React.createElement('div', { className: 'mwb-loading' }, 'Loading promo codes...');
        }

        return React.createElement('div', { className: 'mwb-frontend-promo-codes' }, [
            React.createElement('div', {
                key: 'header',
                style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }
            }, [
                React.createElement('h2', { key: 'title' }, 'Promo Codes Management'),
                React.createElement('button', {
                    key: 'add-btn',
                    className: 'button button-primary',
                    onClick: () => {
                        setEditingPromo(null);
                        setPromoFormData({
                            code: '',
                            discount_type: 'percentage',
                            discount_value: '',
                            min_amount: '',
                            valid_from: '',
                            valid_until: '',
                            usage_limit: '',
                            status: 'active',
                            description: ''
                        });
                        setShowModal(true);
                        // Ensure modal opens properly
                        setTimeout(() => modalUtils.openModal(), 50);
                    }
                }, 'Add New Promo Code')
            ]),
            React.createElement('div', {
                key: 'search',
                style: { marginBottom: '20px' }
            }, [
                React.createElement('input', {
                    key: 'search-input',
                    type: 'text',
                    placeholder: 'Search promo codes...',
                    value: searchTerm,
                    onChange: (e) => setSearchTerm(e.target.value),
                    style: { width: '300px', marginRight: '10px' }
                }),
                React.createElement('button', {
                    key: 'search-btn',
                    className: 'button',
                    onClick: loadPromoCodes
                }, 'Search')
            ]),
            React.createElement('table', { key: 'table', className: 'widefat' }, [
                React.createElement('thead', { key: 'head' }, [
                    React.createElement('tr', { key: 'header' }, [
                        React.createElement('th', { key: 'code' }, 'Code'),
                        React.createElement('th', { key: 'discount' }, 'Discount'),
                        React.createElement('th', { key: 'type' }, 'Type'),
                        React.createElement('th', { key: 'status' }, 'Status'),
                        React.createElement('th', { key: 'actions' }, 'Actions')
                    ])
                ]),
                React.createElement('tbody', { key: 'body' },
                    promoCodes.length > 0 ? promoCodes.map(promo =>
                        React.createElement('tr', { key: promo.id }, [
                            React.createElement('td', { key: 'code' }, promo.code),
                            React.createElement('td', { key: 'discount' }, `${promo.discount_value}${promo.discount_type === 'percentage' ? '%' : '₹'}`),
                            React.createElement('td', { key: 'type' }, promo.discount_type),
                            React.createElement('td', { key: 'status' }, [
                                React.createElement('span', {
                                    key: 'badge',
                                    className: `status-badge status-${promo.status}`
                                }, promo.status)
                            ]),
                            React.createElement('td', { key: 'actions' }, [
                                React.createElement('button', {
                                    key: 'edit',
                                    className: 'button',
                                    onClick: () => handleEditPromo(promo.id),
                                    style: { marginRight: '5px' }
                                }, 'Edit'),
                                React.createElement('button', {
                                    key: 'delete',
                                    className: 'button',
                                    style: { background: '#dc3545', color: 'white' },
                                    onClick: () => handleDelete(promo.id)
                                }, 'Delete')
                            ])
                        ])
                    ) : [
                        React.createElement('tr', { key: 'no-data' }, [
                            React.createElement('td', { key: 'msg', colSpan: 5 }, 'No promo codes found.')
                        ])
                    ]
                )
            ]),

            showModal && React.createElement('div', { 
                className: 'mwb-modal-overlay',
                onClick: (e) => {
                    if (e.target === e.currentTarget) {
                        setShowModal(false);
                        modalUtils.closeModal();
                    }
                }
            },
                React.createElement('div', { className: 'mwb-modal-content mwb-promo-form-modal' },
                    React.createElement('div', { className: 'mwb-modal-header' },
                        React.createElement('h2', null, editingPromo ? 'Edit Promo Code' : 'Add New Promo Code'),
                        React.createElement('button', {
                            className: 'mwb-modal-close',
                            onClick: () => {
                                setShowModal(false);
                                modalUtils.closeModal();
                            }
                        }, '×')
                    ),
                    React.createElement('div', { className: 'mwb-modal-body' },
                        React.createElement('div', { className: 'mwb-form-grid' },
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Promo Code *'),
                                React.createElement('input', {
                                    type: 'text',
                                    value: promoFormData.code || '',
                                    onChange: (e) => setPromoFormData(prev => ({ ...prev, code: e.target.value })),
                                    placeholder: 'Enter promo code',
                                    style: { textTransform: 'uppercase' },
                                    required: true
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Discount Type'),
                                React.createElement('select', {
                                    value: promoFormData.discount_type || 'percentage',
                                    onChange: (e) => setPromoFormData(prev => ({ ...prev, discount_type: e.target.value }))
                                },
                                    React.createElement('option', { value: 'percentage' }, 'Percentage'),
                                    React.createElement('option', { value: 'fixed' }, 'Fixed Amount')
                                )
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Discount Value'),
                                React.createElement('input', {
                                    type: 'number',
                                    step: promoFormData.discount_type === 'percentage' ? '1' : '0.01',
                                    min: '0',
                                    max: promoFormData.discount_type === 'percentage' ? '100' : '',
                                    value: promoFormData.discount_value || '',
                                    onChange: (e) => setPromoFormData(prev => ({ ...prev, discount_value: parseFloat(e.target.value) || 0 }))
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Minimum Order'),
                                React.createElement('input', {
                                    type: 'number',
                                    step: '0.01',
                                    min: '0',
                                    value: promoFormData.min_amount || '',
                                    onChange: (e) => setPromoFormData(prev => ({ ...prev, min_amount: parseFloat(e.target.value) || 0 }))
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Valid From'),
                                React.createElement('input', {
                                    type: 'date',
                                    value: promoFormData.valid_from || '',
                                    onChange: (e) => setPromoFormData(prev => ({ ...prev, valid_from: e.target.value }))
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Valid Until'),
                                React.createElement('input', {
                                    type: 'date',
                                    value: promoFormData.valid_until || '',
                                    onChange: (e) => setPromoFormData(prev => ({ ...prev, valid_until: e.target.value }))
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Usage Limit'),
                                React.createElement('input', {
                                    type: 'number',
                                    min: '0',
                                    value: promoFormData.usage_limit || '',
                                    onChange: (e) => setPromoFormData(prev => ({ ...prev, usage_limit: parseInt(e.target.value) || 0 })),
                                    placeholder: 'Leave blank for unlimited'
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Status'),
                                React.createElement('select', {
                                    value: promoFormData.status || 'active',
                                    onChange: (e) => setPromoFormData(prev => ({ ...prev, status: e.target.value }))
                                },
                                    React.createElement('option', { value: 'active' }, 'Active'),
                                    React.createElement('option', { value: 'inactive' }, 'Inactive')
                                )
                            ),
                            React.createElement('div', { className: 'mwb-form-group mwb-form-group-full' },
                                React.createElement('label', null, 'Description'),
                                React.createElement('textarea', {
                                    value: promoFormData.description || '',
                                    onChange: (e) => setPromoFormData(prev => ({ ...prev, description: e.target.value })),
                                    rows: 3,
                                    placeholder: 'Optional description for this promo code'
                                })
                            )
                        )
                    ),
                    React.createElement('div', { className: 'mwb-modal-footer' },
                        React.createElement('button', {
                            className: 'button',
                            onClick: () => {
                                setShowModal(false);
                                modalUtils.closeModal();
                            }
                        }, 'Cancel'),
                        React.createElement('button', {
                            className: 'button button-primary',
                            onClick: handleSavePromo
                        }, editingPromo ? 'Update Promo Code' : 'Create Promo Code')
                    )
                )
            )
        ]);
    };

    // Frontend Pricing Management Component (simplified)
    const FrontendPricingManagement = () => {
        const [prices, setPrices] = useState({});
        const [loading, setLoading] = useState(true);
        const [saving, setSaving] = useState(false);

        const loadPrices = useCallback(async () => {
            setLoading(true);
            try {
                const data = await frontendAdminApi.getTicketPrices();
                setPrices(data);
            } catch (error) {
                console.error('Failed to load prices:', error);
            } finally {
                setLoading(false);
            }
        }, []);

        useEffect(() => {
            loadPrices();
        }, [loadPrices]);

        const savePrices = async () => {
            setSaving(true);
            try {
                await frontendAdminApi.updateTicketPrices(prices);
                alert('Prices updated successfully!');
            } catch (error) {
                alert('Failed to update prices: ' + error.message);
            } finally {
                setSaving(false);
            }
        };

        if (loading) {
            return React.createElement('div', { className: 'mwb-loading' }, 'Loading pricing...');
        }

        return React.createElement('div', { className: 'mwb-frontend-pricing' }, [
            React.createElement('h2', { key: 'title' }, 'Pricing Management'),
            React.createElement('div', { key: 'prices' }, [
                React.createElement('label', { key: 'general-label' }, 'General Ticket Price: '),
                React.createElement('input', {
                    key: 'general-price',
                    type: 'number',
                    value: prices.general || 400,
                    onChange: (e) => setPrices(prev => ({...prev, general: e.target.value})),
                    style: { marginLeft: '10px', marginRight: '20px' }
                }),
                React.createElement('label', { key: 'child-label' }, 'Child Ticket Price: '),
                React.createElement('input', {
                    key: 'child-price',
                    type: 'number',
                    value: prices.child || 280,
                    onChange: (e) => setPrices(prev => ({...prev, child: e.target.value})),
                    style: { marginLeft: '10px' }
                })
            ]),
            React.createElement('div', { key: 'save', style: { marginTop: '20px' } },
                React.createElement('button', {
                    className: 'button button-primary',
                    onClick: savePrices,
                    disabled: saving
                }, saving ? 'Saving...' : 'Save Prices')
            )
        ]);
    };

    // Frontend Birthday Offers Management Component
    const FrontendBirthdayOffersManagement = () => {
        const [offers, setOffers] = useState([]);
        const [loading, setLoading] = useState(true);
        const [showModal, setShowModal] = useState(false);
        const [editingOffer, setEditingOffer] = useState(null);
        const [formData, setFormData] = useState({
            title: '',
            description: '',
            discount_type: 'percentage',
            discount_value: '',
            applicable_tickets: ['general', 'child', 'senior'],
            minimum_tickets: 1,
            maximum_discount: '',
            requires_id_proof: true,
            valid_days_before: 7,
            valid_days_after: 7,
            age_limit_min: '',
            age_limit_max: '',
            usage_limit_per_customer: 1,
            total_usage_limit: '',
            status: 'active',
            terms_conditions: ''
        });

        const loadOffers = useCallback(async () => {
            try {
                setLoading(true);
                const data = await frontendAdminApi.getBirthdayOffers();
                setOffers(data);
            } catch (error) {
                console.error('Failed to load birthday offers:', error);
            } finally {
                setLoading(false);
            }
        }, []);

        useEffect(() => {
            loadOffers();
        }, [loadOffers]);

        const handleAddOffer = () => {
            setEditingOffer(null);
            setFormData({
                title: '',
                description: '',
                discount_type: 'percentage',
                discount_value: '',
                applicable_tickets: ['general', 'child', 'senior'],
                minimum_tickets: 1,
                maximum_discount: '',
                requires_id_proof: true,
                valid_days_before: 7,
                valid_days_after: 7,
                age_limit_min: '',
                age_limit_max: '',
                usage_limit_per_customer: 1,
                total_usage_limit: '',
                status: 'active',
                terms_conditions: ''
            });
            setShowModal(true);
            setTimeout(() => modalUtils.openModal(), 50);
        };

        const handleEditOffer = async (offerId) => {
            try {
                const offer = await frontendAdminApi.getBirthdayOffer(offerId);
                setEditingOffer(offerId);
                setFormData({
                    ...offer,
                    applicable_tickets: typeof offer.applicable_tickets === 'string' 
                        ? JSON.parse(offer.applicable_tickets) 
                        : offer.applicable_tickets || ['general', 'child', 'senior']
                });
                setShowModal(true);
                setTimeout(() => modalUtils.openModal(), 50);
            } catch (error) {
                alert('Failed to load offer details: ' + error.message);
            }
        };

        const handleDeleteOffer = async (offerId) => {
            if (confirm('Are you sure you want to delete this birthday offer?')) {
                try {
                    await frontendAdminApi.deleteBirthdayOffer(offerId);
                    loadOffers();
                    alert('Birthday offer deleted successfully');
                } catch (error) {
                    alert('Failed to delete offer: ' + error.message);
                }
            }
        };

        const handleSaveOffer = async () => {
            try {
                const dataToSave = {
                    ...formData,
                    applicable_tickets: JSON.stringify(formData.applicable_tickets)
                };
                
                if (editingOffer) {
                    dataToSave.id = editingOffer;
                }
                
                await frontendAdminApi.saveBirthdayOffer(dataToSave);
                setShowModal(false);
                modalUtils.closeModal();
                loadOffers();
                alert(editingOffer ? 'Birthday offer updated successfully' : 'Birthday offer created successfully');
            } catch (error) {
                alert('Failed to save offer: ' + error.message);
            }
        };

        const handleTicketTypeChange = (ticketType, checked) => {
            if (checked) {
                setFormData(prev => ({
                    ...prev,
                    applicable_tickets: [...prev.applicable_tickets, ticketType]
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    applicable_tickets: prev.applicable_tickets.filter(t => t !== ticketType)
                }));
            }
        };

        if (loading) {
            return React.createElement('div', { className: 'mwb-loading' }, 'Loading birthday offers...');
        }

        return React.createElement('div', { className: 'mwb-birthday-offers-management' }, [
            React.createElement('div', {
                key: 'header',
                style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }
            }, [
                React.createElement('h2', { key: 'title' }, 'Birthday Offers Management'),
                React.createElement('button', {
                    key: 'add-btn',
                    className: 'button button-primary',
                    onClick: handleAddOffer
                }, 'Add New Birthday Offer')
            ]),

            React.createElement('table', { key: 'table', className: 'widefat' }, [
                React.createElement('thead', { key: 'head' }, [
                    React.createElement('tr', { key: 'header' }, [
                        React.createElement('th', { key: 'title' }, 'Title'),
                        React.createElement('th', { key: 'discount' }, 'Discount'),
                        React.createElement('th', { key: 'validity' }, 'Validity Period'),
                        React.createElement('th', { key: 'usage' }, 'Usage'),
                        React.createElement('th', { key: 'status' }, 'Status'),
                        React.createElement('th', { key: 'actions' }, 'Actions')
                    ])
                ]),
                React.createElement('tbody', { key: 'body' },
                    offers.length > 0 ? offers.map(offer =>
                        React.createElement('tr', { key: offer.id }, [
                            React.createElement('td', { key: 'title' }, [
                                React.createElement('strong', null, offer.title),
                                React.createElement('br'),
                                React.createElement('small', { style: { color: '#666' } }, offer.description)
                            ]),
                            React.createElement('td', { key: 'discount' }, 
                                `${offer.discount_value}${offer.discount_type === 'percentage' ? '%' : '₹'} off`
                            ),
                            React.createElement('td', { key: 'validity' }, 
                                `${offer.valid_days_before} days before to ${offer.valid_days_after} days after`
                            ),
                            React.createElement('td', { key: 'usage' }, 
                                `${offer.used_count}${offer.total_usage_limit ? `/${offer.total_usage_limit}` : ''} used`
                            ),
                            React.createElement('td', { key: 'status' }, [
                                React.createElement('span', {
                                    key: 'badge',
                                    className: `status-badge status-${offer.status}`
                                }, offer.status)
                            ]),
                            React.createElement('td', { key: 'actions' }, [
                                React.createElement('button', {
                                    key: 'edit',
                                    className: 'button',
                                    onClick: () => handleEditOffer(offer.id),
                                    style: { marginRight: '5px' }
                                }, 'Edit'),
                                React.createElement('button', {
                                    key: 'delete',
                                    className: 'button',
                                    style: { background: '#dc3545', color: 'white' },
                                    onClick: () => handleDeleteOffer(offer.id)
                                }, 'Delete')
                            ])
                        ])
                    ) : [
                        React.createElement('tr', { key: 'no-data' }, [
                            React.createElement('td', { key: 'msg', colSpan: 6 }, 'No birthday offers found.')
                        ])
                    ]
                )
            ]),

            showModal && React.createElement('div', { 
                className: 'mwb-modal-overlay',
                onClick: (e) => {
                    if (e.target === e.currentTarget) {
                        setShowModal(false);
                        modalUtils.closeModal();
                    }
                }
            },
                React.createElement('div', { className: 'mwb-modal-content mwb-birthday-form-modal' },
                    React.createElement('div', { className: 'mwb-modal-header' },
                        React.createElement('h2', null, editingOffer ? 'Edit Birthday Offer' : 'Add New Birthday Offer'),
                        React.createElement('button', {
                            className: 'mwb-modal-close',
                            onClick: () => {
                                setShowModal(false);
                                modalUtils.closeModal();
                            }
                        }, '×')
                    ),
                    React.createElement('div', { className: 'mwb-modal-body' },
                        React.createElement('div', { className: 'mwb-form-grid' },
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Title *'),
                                React.createElement('input', {
                                    type: 'text',
                                    value: formData.title || '',
                                    onChange: (e) => setFormData(prev => ({ ...prev, title: e.target.value })),
                                    placeholder: 'e.g., Birthday Special Offer',
                                    required: true
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Status'),
                                React.createElement('select', {
                                    value: formData.status || 'active',
                                    onChange: (e) => setFormData(prev => ({ ...prev, status: e.target.value }))
                                },
                                    React.createElement('option', { value: 'active' }, 'Active'),
                                    React.createElement('option', { value: 'inactive' }, 'Inactive')
                                )
                            ),
                            React.createElement('div', { className: 'mwb-form-group mwb-form-group-full' },
                                React.createElement('label', null, 'Description'),
                                React.createElement('textarea', {
                                    value: formData.description || '',
                                    onChange: (e) => setFormData(prev => ({ ...prev, description: e.target.value })),
                                    rows: 3,
                                    placeholder: 'Describe the birthday offer'
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Discount Type'),
                                React.createElement('select', {
                                    value: formData.discount_type || 'percentage',
                                    onChange: (e) => setFormData(prev => ({ ...prev, discount_type: e.target.value }))
                                },
                                    React.createElement('option', { value: 'percentage' }, 'Percentage'),
                                    React.createElement('option', { value: 'fixed' }, 'Fixed Amount')
                                )
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Discount Value'),
                                React.createElement('input', {
                                    type: 'number',
                                    step: formData.discount_type === 'percentage' ? '1' : '0.01',
                                    min: '0',
                                    max: formData.discount_type === 'percentage' ? '100' : '',
                                    value: formData.discount_value || '',
                                    onChange: (e) => setFormData(prev => ({ ...prev, discount_value: parseFloat(e.target.value) || 0 }))
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Days Valid Before Birthday'),
                                React.createElement('input', {
                                    type: 'number',
                                    min: '0',
                                    max: '30',
                                    value: formData.valid_days_before || 7,
                                    onChange: (e) => setFormData(prev => ({ ...prev, valid_days_before: parseInt(e.target.value) || 7 }))
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Days Valid After Birthday'),
                                React.createElement('input', {
                                    type: 'number',
                                    min: '0',
                                    max: '30',
                                    value: formData.valid_days_after || 7,
                                    onChange: (e) => setFormData(prev => ({ ...prev, valid_days_after: parseInt(e.target.value) || 7 }))
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-section' },
                                React.createElement('h3', null, 'Applicable Ticket Types'),
                                React.createElement('div', { style: { display: 'flex', gap: '15px', flexWrap: 'wrap' } }, [
                                    React.createElement('label', { key: 'general', style: { display: 'flex', alignItems: 'center', gap: '5px' } }, [
                                        React.createElement('input', {
                                            key: 'checkbox',
                                            type: 'checkbox',
                                            checked: formData.applicable_tickets.includes('general'),
                                            onChange: (e) => handleTicketTypeChange('general', e.target.checked)
                                        }),
                                        React.createElement('span', { key: 'text' }, 'General')
                                    ]),
                                    React.createElement('label', { key: 'child', style: { display: 'flex', alignItems: 'center', gap: '5px' } }, [
                                        React.createElement('input', {
                                            key: 'checkbox',
                                            type: 'checkbox',
                                            checked: formData.applicable_tickets.includes('child'),
                                            onChange: (e) => handleTicketTypeChange('child', e.target.checked)
                                        }),
                                        React.createElement('span', { key: 'text' }, 'Child')
                                    ]),
                                    React.createElement('label', { key: 'senior', style: { display: 'flex', alignItems: 'center', gap: '5px' } }, [
                                        React.createElement('input', {
                                            key: 'checkbox',
                                            type: 'checkbox',
                                            checked: formData.applicable_tickets.includes('senior'),
                                            onChange: (e) => handleTicketTypeChange('senior', e.target.checked)
                                        }),
                                        React.createElement('span', { key: 'text' }, 'Senior')
                                    ])
                                ])
                            )
                        )
                    ),
                    React.createElement('div', { className: 'mwb-modal-footer' },
                        React.createElement('button', {
                            className: 'button',
                            onClick: () => {
                                setShowModal(false);
                                modalUtils.closeModal();
                            }
                        }, 'Cancel'),
                        React.createElement('button', {
                            className: 'button button-primary',
                            onClick: handleSaveOffer
                        }, editingOffer ? 'Update Offer' : 'Create Offer')
                    )
                )
            )
        ]);
    };

    // Frontend Availability Management Component (EXACT copy from WordPress admin)
    const FrontendAvailabilityManagement = () => {
        const [availability, setAvailability] = useState([]);
        const [loading, setLoading] = useState(true);
        const [selectedLocation, setSelectedLocation] = useState(marineWorldBooking.locations?.[0]?.id || 1);
        const [currentMonth, setCurrentMonth] = useState(new Date());
        const [editingDate, setEditingDate] = useState(null);
        const [editForm, setEditForm] = useState({
            capacity: '',
            isBlackout: false,
            specialPricing: ''
        });

        const loadAvailability = useCallback(async () => {
            try {
                setLoading(true);
                const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                
                const data = await frontendAdminApi.getAvailabilityData(
                    selectedLocation,
                    startDate.toISOString().split('T')[0],
                    endDate.toISOString().split('T')[0]
                );
                setAvailability(data);
            } catch (error) {
                console.error('Failed to load availability:', error);
            } finally {
                setLoading(false);
            }
        }, [selectedLocation, currentMonth]);

        useEffect(() => {
            loadAvailability();
        }, [loadAvailability]);

        const handleEditDate = (date) => {
            const dayData = availability.find(d => d.date === date);
            setEditingDate(date);
            setEditForm({
                capacity: dayData?.total_capacity || 1000,
                isBlackout: dayData?.is_blackout || false,
                specialPricing: dayData?.special_pricing || ''
            });
        };

        const handleSaveDate = async () => {
            try {
                await frontendAdminApi.updateAvailability(
                    selectedLocation,
                    editingDate,
                    editForm.capacity,
                    editForm.isBlackout,
                    editForm.specialPricing
                );
                setEditingDate(null);
                loadAvailability();
                alert('Availability updated successfully');
            } catch (error) {
                alert('Failed to update availability: ' + error.message);
            }
        };

        const renderCalendar = () => {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            const days = [];
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDay.getDay());
            
            for (let i = 0; i < 42; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                days.push(date);
            }

            return days.map((date, index) => {
                const dateStr = date.toISOString().split('T')[0];
                const dayData = availability.find(d => d.date === dateStr);
                const isCurrentMonth = date.getMonth() === month;
                const isToday = date.toDateString() === new Date().toDateString();
                
                let className = 'mwb-calendar-day';
                if (!isCurrentMonth) className += ' other-month';
                if (isToday) className += ' today';
                if (dayData?.is_blackout) className += ' blackout';
                else if (dayData?.status) className += ` ${dayData.status}`;

                return React.createElement('div', {
                    key: index,
                    className,
                    onClick: isCurrentMonth ? () => handleEditDate(dateStr) : null
                },
                    React.createElement('div', { className: 'date-number' }, date.getDate()),
                    dayData && React.createElement('div', { className: 'availability-info' },
                        React.createElement('div', null, `${dayData.available_slots}/${dayData.total_capacity}`),
                        dayData.special_pricing && 
                            React.createElement('div', { className: 'special-price' }, 
                                frontendUtils.formatCurrency(dayData.special_pricing)
                            )
                    )
                );
            });
        };

        return React.createElement('div', { className: 'mwb-availability-management' },
            React.createElement('div', { className: 'mwb-availability-header' },
                React.createElement('div', { className: 'mwb-location-selector' },
                    React.createElement('label', null, 'Location: '),
                    React.createElement('select', {
                        value: selectedLocation,
                        onChange: (e) => setSelectedLocation(parseInt(e.target.value))
                    },
                        (marineWorldBooking.locations || []).map(location =>
                            React.createElement('option', { 
                                key: location.id, 
                                value: location.id 
                            }, location.name)
                        )
                    )
                ),
                React.createElement('div', { className: 'mwb-month-navigation' },
                    React.createElement('button', {
                        className: 'button',
                        onClick: () => setCurrentMonth(prev => {
                            const newMonth = new Date(prev);
                            newMonth.setMonth(prev.getMonth() - 1);
                            return newMonth;
                        })
                    }, '‹ Previous'),
                    React.createElement('h3', null, 
                        currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    ),
                    React.createElement('button', {
                        className: 'button',
                        onClick: () => setCurrentMonth(prev => {
                            const newMonth = new Date(prev);
                            newMonth.setMonth(prev.getMonth() + 1);
                            return newMonth;
                        })
                    }, 'Next ›')
                )
            ),

            loading ? React.createElement(LoadingSpinner) :
                React.createElement('div', { className: 'mwb-availability-calendar' },
                    React.createElement('div', { className: 'mwb-calendar-weekdays' },
                        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day =>
                            React.createElement('div', { key: day, className: 'mwb-weekday' }, day)
                        )
                    ),
                    React.createElement('div', { className: 'mwb-calendar-grid' }, renderCalendar())
                ),

            editingDate && React.createElement('div', { className: 'mwb-edit-modal' },
                React.createElement('div', { className: 'mwb-modal-content' },
                    React.createElement('h3', null, `Edit Availability - ${frontendUtils.formatDate(editingDate)}`),
                    React.createElement('div', { className: 'mwb-form-group' },
                        React.createElement('label', null, 'Capacity:'),
                        React.createElement('input', {
                            type: 'number',
                            value: editForm.capacity,
                            onChange: (e) => setEditForm(prev => ({ ...prev, capacity: parseInt(e.target.value) }))
                        })
                    ),
                    React.createElement('div', { className: 'mwb-form-group' },
                        React.createElement('label', null,
                            React.createElement('input', {
                                type: 'checkbox',
                                checked: editForm.isBlackout,
                                onChange: (e) => setEditForm(prev => ({ ...prev, isBlackout: e.target.checked }))
                            }),
                            ' Blackout Date'
                        )
                    ),
                    React.createElement('div', { className: 'mwb-form-group' },
                        React.createElement('label', null, 'Special Pricing:'),
                        React.createElement('input', {
                            type: 'number',
                            step: '0.01',
                            value: editForm.specialPricing,
                            onChange: (e) => setEditForm(prev => ({ ...prev, specialPricing: parseFloat(e.target.value) || '' }))
                        })
                    ),
                    React.createElement('div', { className: 'mwb-modal-actions' },
                        React.createElement('button', {
                            className: 'button button-primary',
                            onClick: handleSaveDate
                        }, 'Save'),
                        React.createElement('button', {
                            className: 'button',
                            onClick: () => setEditingDate(null)
                        }, 'Cancel')
                    )
                )
            )
        );
    };

    // Frontend Add-ons Management Component (full implementation)
    const FrontendAddonsManagement = () => {
        const [addons, setAddons] = useState([]);
        const [loading, setLoading] = useState(true);
        const [search, setSearch] = useState('');
        const [statusFilter, setStatusFilter] = useState('');
        const [selectedAddons, setSelectedAddons] = useState([]);
        const [bulkAction, setBulkAction] = useState('');
        const [showForm, setShowForm] = useState(false);
        const [editingAddon, setEditingAddon] = useState(null);
        

        const [formData, setFormData] = useState({
            name: '',
            description: '',
            price: '',
            status: 'active',
            display_order: 0,
            image_url: ''
        });

        const loadAddons = useCallback(async () => {
            try {
                setLoading(true);
                const data = await frontendAdminApi.getAddonsList(search, statusFilter);
                setAddons(data);
            } catch (error) {
                console.error('Failed to load add-ons:', error);
            } finally {
                setLoading(false);
            }
        }, [search, statusFilter]);

        useEffect(() => {
            loadAddons();
        }, [loadAddons]);

        const handleAddAddon = () => {
            setEditingAddon(null);
            setFormData({
                name: '',
                description: '',
                price: '',
                status: 'active',
                display_order: addons.length,
                image_url: ''
            });
            setShowForm(true);
            // Ensure modal opens properly
            setTimeout(() => modalUtils.openModal(), 50);
        };

        const handleEditAddon = async (addonId) => {
            try {
                const addon = await frontendAdminApi.getAddon(addonId);
                setEditingAddon(addonId);
                setFormData(addon);
                setShowForm(true);
                // Ensure modal opens properly
                setTimeout(() => modalUtils.openModal(), 50);
            } catch (error) {
                alert('Failed to load addon details: ' + error.message);
            }
        };

        const handleDeleteAddon = async (addonId) => {
            if (confirm('Are you sure you want to delete this add-on?')) {
                try {
                    await frontendAdminApi.deleteAddon(addonId);
                    loadAddons();
                    alert('Add-on deleted successfully');
                } catch (error) {
                    alert('Failed to delete add-on: ' + error.message);
                }
            }
        };

        const handleSaveAddon = async () => {
            try {
                if (editingAddon) {
                    await frontendAdminApi.saveAddon({ ...formData, id: editingAddon });
                    alert('Add-on updated successfully');
                } else {
                    await frontendAdminApi.saveAddon(formData);
                    alert('Add-on created successfully');
                }
                setShowForm(false);
                loadAddons();
            } catch (error) {
                alert('Failed to save add-on: ' + error.message);
            }
        };

        const handleBulkAction = async () => {
            if (!bulkAction || selectedAddons.length === 0) return;

            try {
                await frontendAdminApi.bulkActionAddons(selectedAddons, bulkAction);
                setSelectedAddons([]);
                setBulkAction('');
                loadAddons();
                alert('Bulk action completed successfully');
            } catch (error) {
                alert('Bulk action failed: ' + error.message);
            }
        };

        return React.createElement('div', { className: 'mwb-addons-management' },
            React.createElement('div', { className: 'mwb-addons-header' },
                React.createElement('div', { className: 'mwb-search-filters' },
                    React.createElement('input', {
                        type: 'text',
                        placeholder: 'Search add-ons...',
                        value: search,
                        onChange: (e) => setSearch(e.target.value),
                        className: 'mwb-search-input'
                    }),
                    React.createElement('select', {
                        value: statusFilter,
                        onChange: (e) => setStatusFilter(e.target.value)
                    },
                        React.createElement('option', { value: '' }, 'All Statuses'),
                        React.createElement('option', { value: 'active' }, 'Active'),
                        React.createElement('option', { value: 'inactive' }, 'Inactive')
                    )
                ),
                React.createElement('div', { className: 'mwb-addon-actions' },
                    React.createElement('button', {
                        className: 'button button-primary',
                        onClick: handleAddAddon
                    }, 'Add New Add-on'),
                    React.createElement('div', { className: 'mwb-bulk-actions' },
                        React.createElement('select', {
                            value: bulkAction,
                            onChange: (e) => setBulkAction(e.target.value)
                        },
                            React.createElement('option', { value: '' }, 'Bulk Actions'),
                            React.createElement('option', { value: 'activate' }, 'Activate'),
                            React.createElement('option', { value: 'deactivate' }, 'Deactivate'),
                            React.createElement('option', { value: 'delete' }, 'Delete')
                        ),
                        React.createElement('button', {
                            className: 'button',
                            onClick: handleBulkAction,
                            disabled: !bulkAction || selectedAddons.length === 0
                        }, 'Apply')
                    )
                )
            ),

            loading ? React.createElement(LoadingSpinner) :
                React.createElement('div', { className: 'mwb-addons-grid' },
                    addons.map(addon =>
                        React.createElement('div', { 
                            key: addon.id, 
                            className: `mwb-addon-card ${addon.status}` 
                        },
                            React.createElement('div', { className: 'mwb-addon-header' },
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: selectedAddons.includes(addon.id),
                                    onChange: (e) => {
                                        if (e.target.checked) {
                                            setSelectedAddons(prev => [...prev, addon.id]);
                                        } else {
                                            setSelectedAddons(prev => prev.filter(id => id !== addon.id));
                                        }
                                    }
                                }),
                                React.createElement('h3', null, addon.name),
                                React.createElement('span', { 
                                    className: `mwb-status-badge ${addon.status}` 
                                }, addon.status)
                            ),
                            React.createElement('div', { className: 'mwb-addon-details' },
                                React.createElement('div', { className: 'mwb-addon-description' },
                                    addon.description
                                ),
                                React.createElement('div', { className: 'mwb-addon-price' },
                                    React.createElement('strong', null, 'Price: '),
                                    React.createElement('span', null, frontendUtils.formatCurrency(addon.price))
                                )
                            ),
                            React.createElement('div', { className: 'mwb-addon-actions' },
                                React.createElement('button', {
                                    className: 'button button-small',
                                    onClick: () => handleEditAddon(addon.id)
                                }, 'Edit'),
                                React.createElement('button', {
                                    className: 'button button-small button-link-delete',
                                    onClick: () => handleDeleteAddon(addon.id)
                                }, 'Delete')
                            )
                        )
                    )
                ),

            showForm && React.createElement('div', { 
                className: 'mwb-modal-overlay',
                onClick: (e) => {
                    if (e.target === e.currentTarget) {
                        setShowForm(false);
                        modalUtils.closeModal();
                    }
                }
            },
                React.createElement('div', { className: 'mwb-modal-content mwb-addon-form-modal' },
                    React.createElement('div', { className: 'mwb-modal-header' },
                        React.createElement('h2', null, editingAddon ? 'Edit Add-on' : 'Add New Add-on'),
                        React.createElement('button', {
                            className: 'mwb-modal-close',
                            onClick: () => {
                                setShowForm(false);
                                modalUtils.closeModal();
                            }
                        }, '×')
                    ),
                    React.createElement('div', { className: 'mwb-modal-body' },
                        React.createElement('div', { className: 'mwb-form-grid' },
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Add-on Name *'),
                                React.createElement('input', {
                                    type: 'text',
                                    value: formData.name,
                                    onChange: (e) => setFormData(prev => ({ ...prev, name: e.target.value })),
                                    required: true
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Price'),
                                React.createElement('input', {
                                    type: 'number',
                                    step: '0.01',
                                    value: formData.price,
                                    onChange: (e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group mwb-form-group-full' },
                                React.createElement('label', null, 'Description'),
                                React.createElement('textarea', {
                                    value: formData.description,
                                    onChange: (e) => setFormData(prev => ({ ...prev, description: e.target.value })),
                                    rows: 3
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Status'),
                                React.createElement('select', {
                                    value: formData.status,
                                    onChange: (e) => setFormData(prev => ({ ...prev, status: e.target.value }))
                                },
                                    React.createElement('option', { value: 'active' }, 'Active'),
                                    React.createElement('option', { value: 'inactive' }, 'Inactive')
                                )
                            )
                        )
                    ),
                    React.createElement('div', { className: 'mwb-modal-footer' },
                        React.createElement('button', {
                            className: 'button',
                            onClick: () => {
                                setShowForm(false);
                                modalUtils.closeModal();
                            }
                        }, 'Cancel'),
                        React.createElement('button', {
                            className: 'button button-primary',
                            onClick: handleSaveAddon
                        }, editingAddon ? 'Update Add-on' : 'Create Add-on')
                    )
                )
            )
        );
    };

    // Frontend Locations Management Component (full implementation)
    const FrontendLocationsManagement = () => {
        const [locations, setLocations] = useState([]);
        const [loading, setLoading] = useState(true);
        const [search, setSearch] = useState('');
        const [statusFilter, setStatusFilter] = useState('');
        const [selectedLocations, setSelectedLocations] = useState([]);
        const [bulkAction, setBulkAction] = useState('');
        const [showForm, setShowForm] = useState(false);
        const [editingLocation, setEditingLocation] = useState(null);

        const [formData, setFormData] = useState({
            name: '',
            address: '',
            city: '',
            state: '',
            pincode: '',
            phone: '',
            email: '',
            status: 'active',
            timings: {
                monday: '9:00 AM - 6:00 PM',
                tuesday: '9:00 AM - 6:00 PM',
                wednesday: '9:00 AM - 6:00 PM',
                thursday: '9:00 AM - 6:00 PM',
                friday: '9:00 AM - 6:00 PM',
                saturday: '9:00 AM - 6:00 PM',
                sunday: '9:00 AM - 6:00 PM'
            },
            facilities: []
        });

        const [newFacility, setNewFacility] = useState('');

        const loadLocations = useCallback(async () => {
            try {
                setLoading(true);
                const data = await frontendAdminApi.getLocationsList(search, statusFilter);
                setLocations(data);
            } catch (error) {
                console.error('Failed to load locations:', error);
            } finally {
                setLoading(false);
            }
        }, [search, statusFilter]);

        useEffect(() => {
            loadLocations();
        }, [loadLocations]);

        const handleAddLocation = () => {
            setEditingLocation(null);
            setFormData({
                name: '',
                address: '',
                city: '',
                state: '',
                pincode: '',
                phone: '',
                email: '',
                status: 'active',
                timings: {
                    monday: '9:00 AM - 6:00 PM',
                    tuesday: '9:00 AM - 6:00 PM',
                    wednesday: '9:00 AM - 6:00 PM',
                    thursday: '9:00 AM - 6:00 PM',
                    friday: '9:00 AM - 6:00 PM',
                    saturday: '9:00 AM - 6:00 PM',
                    sunday: '9:00 AM - 6:00 PM'
                },
                facilities: []
            });
            setShowForm(true);
            // Ensure modal opens properly
            setTimeout(() => modalUtils.openModal(), 50);
        };

        const handleEditLocation = async (locationId) => {
            try {
                const location = await frontendAdminApi.getLocation(locationId);
                setEditingLocation(locationId);
                setFormData(location);
                setShowForm(true);
                // Ensure modal opens properly
                setTimeout(() => modalUtils.openModal(), 50);
            } catch (error) {
                alert('Failed to load location details: ' + error.message);
            }
        };

        const handleDeleteLocation = async (locationId) => {
            if (confirm('Are you sure you want to delete this location?')) {
                try {
                    await frontendAdminApi.deleteLocation(locationId);
                    loadLocations();
                    alert('Location deleted successfully');
                } catch (error) {
                    alert('Failed to delete location: ' + error.message);
                }
            }
        };

        const handleSaveLocation = async () => {
            try {
                if (editingLocation) {
                    await frontendAdminApi.saveLocation({ ...formData, id: editingLocation });
                    alert('Location updated successfully');
                } else {
                    await frontendAdminApi.saveLocation(formData);
                    alert('Location created successfully');
                }
                setShowForm(false);
                loadLocations();
            } catch (error) {
                alert('Failed to save location: ' + error.message);
            }
        };

        const handleBulkAction = async () => {
            if (!bulkAction || selectedLocations.length === 0) return;

            try {
                await frontendAdminApi.bulkActionLocations(selectedLocations, bulkAction);
                setSelectedLocations([]);
                setBulkAction('');
                loadLocations();
                alert('Bulk action completed successfully');
            } catch (error) {
                alert('Bulk action failed: ' + error.message);
            }
        };

        const addFacility = () => {
            if (newFacility.trim()) {
                setFormData(prev => ({
                    ...prev,
                    facilities: [...prev.facilities, newFacility.trim()]
                }));
                setNewFacility('');
            }
        };

        const removeFacility = (facility) => {
            setFormData(prev => ({
                ...prev,
                facilities: prev.facilities.filter(f => f !== facility)
            }));
        };

        return React.createElement('div', { className: 'mwb-locations-management' },
            React.createElement('div', { className: 'mwb-locations-header' },
                React.createElement('div', { className: 'mwb-search-filters' },
                    React.createElement('input', {
                        type: 'text',
                        placeholder: 'Search locations...',
                        value: search,
                        onChange: (e) => setSearch(e.target.value),
                        className: 'mwb-search-input'
                    }),
                    React.createElement('select', {
                        value: statusFilter,
                        onChange: (e) => setStatusFilter(e.target.value)
                    },
                        React.createElement('option', { value: '' }, 'All Statuses'),
                        React.createElement('option', { value: 'active' }, 'Active'),
                        React.createElement('option', { value: 'inactive' }, 'Inactive')
                    )
                ),
                React.createElement('div', { className: 'mwb-location-actions' },
                    React.createElement('button', {
                        className: 'button button-primary',
                        onClick: handleAddLocation
                    }, 'Add New Location'),
                    React.createElement('div', { className: 'mwb-bulk-actions' },
                        React.createElement('select', {
                            value: bulkAction,
                            onChange: (e) => setBulkAction(e.target.value)
                        },
                            React.createElement('option', { value: '' }, 'Bulk Actions'),
                            React.createElement('option', { value: 'activate' }, 'Activate'),
                            React.createElement('option', { value: 'deactivate' }, 'Deactivate'),
                            React.createElement('option', { value: 'delete' }, 'Delete')
                        ),
                        React.createElement('button', {
                            className: 'button',
                            onClick: handleBulkAction,
                            disabled: !bulkAction || selectedLocations.length === 0
                        }, 'Apply')
                    )
                )
            ),

            loading ? React.createElement(LoadingSpinner) :
                React.createElement('div', { className: 'mwb-locations-grid' },
                    locations.map(location =>
                        React.createElement('div', { 
                            key: location.id, 
                            className: `mwb-location-card ${location.status}` 
                        },
                            React.createElement('div', { className: 'mwb-location-header' },
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: selectedLocations.includes(location.id),
                                    onChange: (e) => {
                                        if (e.target.checked) {
                                            setSelectedLocations(prev => [...prev, location.id]);
                                        } else {
                                            setSelectedLocations(prev => prev.filter(id => id !== location.id));
                                        }
                                    }
                                }),
                                React.createElement('h3', null, location.name),
                                React.createElement('span', { 
                                    className: `mwb-status-badge ${location.status}` 
                                }, location.status)
                            ),
                            React.createElement('div', { className: 'mwb-location-details' },
                                React.createElement('div', { className: 'mwb-location-address' },
                                    React.createElement('strong', null, 'Address:'),
                                    React.createElement('span', null, `${location.address}, ${location.city}, ${location.state} - ${location.pincode}`)
                                ),
                                React.createElement('div', { className: 'mwb-location-contact' },
                                    React.createElement('div', null,
                                        React.createElement('strong', null, 'Phone: '),
                                        React.createElement('span', null, location.phone)
                                    ),
                                    React.createElement('div', null,
                                        React.createElement('strong', null, 'Email: '),
                                        React.createElement('span', null, location.email)
                                    )
                                )
                            ),
                            React.createElement('div', { className: 'mwb-location-actions' },
                                React.createElement('button', {
                                    className: 'button button-small',
                                    onClick: () => handleEditLocation(location.id)
                                }, 'Edit'),
                                React.createElement('button', {
                                    className: 'button button-small button-link-delete',
                                    onClick: () => handleDeleteLocation(location.id)
                                }, 'Delete')
                            )
                        )
                    )
                ),

            showForm && React.createElement('div', { 
                className: 'mwb-modal-overlay',
                onClick: (e) => {
                    if (e.target === e.currentTarget) {
                        setShowForm(false);
                        modalUtils.closeModal();
                    }
                }
            },
                React.createElement('div', { className: 'mwb-modal-content mwb-location-form-modal' },
                    React.createElement('div', { className: 'mwb-modal-header' },
                        React.createElement('h2', null, editingLocation ? 'Edit Location' : 'Add New Location'),
                        React.createElement('button', {
                            className: 'mwb-modal-close',
                            onClick: () => {
                                setShowForm(false);
                                modalUtils.closeModal();
                            }
                        }, '×')
                    ),
                    React.createElement('div', { className: 'mwb-modal-body' },
                        React.createElement('div', { className: 'mwb-form-grid' },
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Location Name *'),
                                React.createElement('input', {
                                    type: 'text',
                                    value: formData.name,
                                    onChange: (e) => setFormData(prev => ({ ...prev, name: e.target.value })),
                                    required: true
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Status'),
                                React.createElement('select', {
                                    value: formData.status,
                                    onChange: (e) => setFormData(prev => ({ ...prev, status: e.target.value }))
                                },
                                    React.createElement('option', { value: 'active' }, 'Active'),
                                    React.createElement('option', { value: 'inactive' }, 'Inactive')
                                )
                            ),
                            React.createElement('div', { className: 'mwb-form-group mwb-form-group-full' },
                                React.createElement('label', null, 'Address'),
                                React.createElement('textarea', {
                                    value: formData.address,
                                    onChange: (e) => setFormData(prev => ({ ...prev, address: e.target.value })),
                                    rows: 3
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'City'),
                                React.createElement('input', {
                                    type: 'text',
                                    value: formData.city,
                                    onChange: (e) => setFormData(prev => ({ ...prev, city: e.target.value }))
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'State'),
                                React.createElement('input', {
                                    type: 'text',
                                    value: formData.state,
                                    onChange: (e) => setFormData(prev => ({ ...prev, state: e.target.value }))
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Phone'),
                                React.createElement('input', {
                                    type: 'tel',
                                    value: formData.phone,
                                    onChange: (e) => setFormData(prev => ({ ...prev, phone: e.target.value }))
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Email'),
                                React.createElement('input', {
                                    type: 'email',
                                    value: formData.email,
                                    onChange: (e) => setFormData(prev => ({ ...prev, email: e.target.value }))
                                })
                            )
                        ),

                        React.createElement('div', { className: 'mwb-form-section' },
                            React.createElement('h3', null, 'Facilities'),
                            React.createElement('div', { className: 'mwb-facilities-input' },
                                React.createElement('input', {
                                    type: 'text',
                                    value: newFacility,
                                    onChange: (e) => setNewFacility(e.target.value),
                                    placeholder: 'Add facility...',
                                    onKeyPress: (e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addFacility();
                                        }
                                    }
                                }),
                                React.createElement('button', {
                                    type: 'button',
                                    className: 'button',
                                    onClick: addFacility
                                }, 'Add')
                            ),
                            React.createElement('div', { className: 'mwb-facilities-list' },
                                formData.facilities.map((facility, index) =>
                                    React.createElement('span', { 
                                        key: index, 
                                        className: 'mwb-facility-tag removable' 
                                    },
                                        facility,
                                        React.createElement('button', {
                                            type: 'button',
                                            onClick: () => removeFacility(facility),
                                            className: 'mwb-remove-facility'
                                        }, '×')
                                    )
                                )
                            )
                        )
                    ),
                    React.createElement('div', { className: 'mwb-modal-footer' },
                        React.createElement('button', {
                            className: 'button',
                            onClick: () => {
                                setShowForm(false);
                                modalUtils.closeModal();
                            }
                        }, 'Cancel'),
                        React.createElement('button', {
                            className: 'button button-primary',
                            onClick: handleSaveLocation
                        }, editingLocation ? 'Update Location' : 'Create Location')
                    )
                )
            )
        );
    };

})();