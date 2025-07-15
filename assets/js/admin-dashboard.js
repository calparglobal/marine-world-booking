// Marine World Booking Admin Dashboard
(function() {
    'use strict';

    // Check if React is available
    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
        console.error('Marine World Admin: React is not loaded');
        return;
    }

    const { useState, useEffect, useCallback } = React;
    const { render } = ReactDOM;

    // API Helper Functions
    const adminApi = {
        async request(action, data = {}) {
            console.log('AdminAPI request called:', action, data);
            
            const formData = new FormData();
            formData.append('action', action);
            formData.append('nonce', marineWorldAdmin.nonce);
            
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

            // Debug: Log what's being sent
            console.log('FormData being sent:');
            for (let pair of formData.entries()) {
                console.log(pair[0] + ': ' + pair[1]);
            }

            try {
                const response = await fetch(marineWorldAdmin.ajaxUrl, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                console.log('AdminAPI response:', result);
                
                if (!result.success) {
                    throw new Error(result.data || 'Request failed');
                }
                
                return result.data;
            } catch (error) {
                console.error('Admin API Error:', error);
                throw error;
            }
        },

        getDashboardStats(dateFrom, dateTo) {
            return this.request('mwb_get_dashboard_stats', { date_from: dateFrom, date_to: dateTo });
        },

        getBookingsList(page = 1, perPage = 20, search = '', filters = {}) {
            return this.request('mwb_get_bookings_list', { 
                page, 
                per_page: perPage, 
                search, 
                ...filters 
            });
        },

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

        exportBookings(format, filters) {
            return this.request('mwb_export_bookings', { format, ...filters });
        },

        bulkActionBookings(bookingIds, action, data = {}) {
            return this.request('mwb_bulk_action_bookings', {
                booking_ids: bookingIds,
                action,
                ...data
            });
        },

        getSettings() {
            return this.request('mwb_get_settings');
        },

        saveSettings(settings) {
            return this.request('mwb_save_settings', { settings });
        },

        clearAllBookings(confirm) {
            return this.request('mwb_clear_all_bookings', { confirm });
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

        // Add-ons management methods
        getAddonsList(search = '', status = '') {
            return this.request('mwb_get_addons_list', { search, status });
        },

        getAddon(addonId) {
            return this.request('mwb_get_addon', { addon_id: addonId });
        },

        saveAddon(addonData) {
            // Special handling for addon save to support file uploads
            const formData = new FormData();
            formData.append('action', 'mwb_save_addon');
            formData.append('nonce', marineWorldAdmin.nonce);
            
            // Handle regular form fields
            Object.keys(addonData).forEach(key => {
                if (key === 'image' && addonData[key] instanceof File) {
                    // Handle file upload
                    formData.append('addon_image', addonData[key]);
                } else if (typeof addonData[key] === 'object' && addonData[key] !== null && !Array.isArray(addonData[key])) {
                    Object.keys(addonData[key]).forEach(subKey => {
                        formData.append(`${key}[${subKey}]`, addonData[key][subKey]);
                    });
                } else if (Array.isArray(addonData[key])) {
                    addonData[key].forEach(item => formData.append(`${key}[]`, item));
                } else if (key !== 'image') {
                    formData.append(key, addonData[key]);
                }
            });

            return fetch(marineWorldAdmin.ajaxUrl, {
                method: 'POST',
                body: formData
            }).then(response => response.json())
            .then(result => {
                if (!result.success) {
                    throw new Error(result.data || 'Request failed');
                }
                return result.data;
            });
        },

        deleteAddon(addonId) {
            return this.request('mwb_delete_addon', { addon_id: addonId });
        },

        bulkActionAddons(addonIds, action) {
            return this.request('mwb_bulk_action_addons', {
                addon_ids: addonIds,
                action
            });
        },

        updateAddonOrder(addonOrders) {
            return this.request('mwb_update_addon_order', { addon_orders: addonOrders });
        },

        getAddonStats(addonId = null, dateFrom = null, dateTo = null) {
            return this.request('mwb_get_addon_stats', {
                addon_id: addonId,
                date_from: dateFrom,
                date_to: dateTo
            });
        },

        // Birthday offers management methods
        getBirthdayOffersList(search = '', status = '') {
            return this.request('mwb_get_birthday_offers', { search, status });
        },

        getBirthdayOffer(offerId) {
            return this.request('mwb_get_birthday_offer', { offer_id: offerId });
        },

        saveBirthdayOffer(offerData) {
            console.log('AdminAPI saveBirthdayOffer called with:', offerData);
            return this.request('mwb_save_birthday_offer', offerData);
        },

        deleteBirthdayOffer(offerId) {
            return this.request('mwb_delete_birthday_offer', { offer_id: offerId });
        }
    };

    // Utility Functions
    const utils = {
        formatCurrency(amount) {
            return `${marineWorldAdmin.currency}${parseFloat(amount).toLocaleString('en-IN')}`;
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

    // Dashboard Component
    const Dashboard = () => {
        const [stats, setStats] = useState(null);
        const [loading, setLoading] = useState(true);
        const [dateRange, setDateRange] = useState({
            from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            to: new Date().toISOString().split('T')[0]
        });

        const loadStats = useCallback(async () => {
            try {
                setLoading(true);
                const data = await adminApi.getDashboardStats(dateRange.from, dateRange.to);
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
                    React.createElement('input', {
                        type: 'date',
                        value: dateRange.to,
                        onChange: (e) => setDateRange(prev => ({ ...prev, to: e.target.value }))
                    }),
                    React.createElement('button', {
                        className: 'button button-primary',
                        onClick: loadStats
                    }, 'Update')
                )
            ),
            
            stats && React.createElement('div', { className: 'mwb-stats-grid' },
                React.createElement(StatsCard, {
                    title: 'Total Bookings',
                    value: stats.stats?.total_bookings || 0,
                    icon: 'dashicons-calendar-alt'
                }),
                React.createElement(StatsCard, {
                    title: 'Total Revenue',
                    value: utils.formatCurrency(stats.stats?.total_revenue || 0),
                    icon: 'dashicons-money-alt'
                }),
                React.createElement(StatsCard, {
                    title: 'Total Tickets',
                    value: stats.stats?.total_tickets || 0,
                    icon: 'dashicons-tickets-alt'
                }),
                React.createElement(StatsCard, {
                    title: 'Average Booking Value',
                    value: utils.formatCurrency(stats.stats?.average_booking_value || 0),
                    icon: 'dashicons-chart-line'
                })
            ),

            React.createElement('div', { className: 'mwb-dashboard-grid' },
                React.createElement('div', { className: 'mwb-recent-bookings' },
                    React.createElement('h3', null, 'Recent Bookings'),
                    stats.recent_bookings && stats.recent_bookings.length > 0 ?
                        React.createElement('div', { className: 'mwb-bookings-list' },
                            stats.recent_bookings.map(booking =>
                                React.createElement('div', { 
                                    key: booking.id, 
                                    className: 'mwb-booking-item' 
                                },
                                    React.createElement('div', { className: 'mwb-booking-info' },
                                        React.createElement('strong', null, booking.booking_id),
                                        React.createElement('span', null, booking.customer_name),
                                        React.createElement('span', null, utils.formatDate(booking.booking_date))
                                    ),
                                    React.createElement('div', { className: 'mwb-booking-amount' },
                                        utils.formatCurrency(booking.total_amount)
                                    ),
                                    React.createElement('div', { 
                                        className: `mwb-booking-status ${booking.booking_status}` 
                                    }, booking.booking_status)
                                )
                            )
                        ) : React.createElement('p', null, 'No recent bookings')
                ),

                React.createElement('div', { className: 'mwb-upcoming-events' },
                    React.createElement('h3', null, 'Upcoming Events (Next 7 Days)'),
                    stats.upcoming_events && stats.upcoming_events.length > 0 ?
                        React.createElement('div', { className: 'mwb-events-list' },
                            stats.upcoming_events.map(event =>
                                React.createElement('div', { 
                                    key: event.booking_date, 
                                    className: 'mwb-event-item' 
                                },
                                    React.createElement('div', { className: 'mwb-event-date' },
                                        utils.formatDate(event.booking_date)
                                    ),
                                    React.createElement('div', { className: 'mwb-event-stats' },
                                        React.createElement('span', null, `${event.booking_count} bookings`),
                                        React.createElement('span', null, `${event.total_visitors} visitors`)
                                    )
                                )
                            )
                        ) : React.createElement('p', null, 'No upcoming events')
                )
            )
        );
    };

    // Bookings Management Component
    const BookingsManagement = () => {
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
                const data = await adminApi.getBookingsList(page, pagination.perPage, search, filters);
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
            utils.debounce(() => loadBookings(1), 500),
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
                await adminApi.bulkActionBookings(selectedBookings, bulkAction, { reason });
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
                const result = await adminApi.exportBookings(format, filters);
                if (result.file_url) {
                    window.open(result.file_url, '_blank');
                }
            } catch (error) {
                alert('Export failed: ' + error.message);
            }
        };

        return React.createElement('div', { className: 'mwb-bookings-management' },
            React.createElement('div', { className: 'mwb-bookings-header' },
                React.createElement('div', { className: 'mwb-search-filters' },
                    React.createElement('input', {
                        type: 'text',
                        placeholder: 'Search bookings...',
                        value: search,
                        onChange: (e) => setSearch(e.target.value),
                        className: 'mwb-search-input'
                    }),
                    React.createElement('input', {
                        type: 'date',
                        value: filters.date_from,
                        onChange: (e) => setFilters(prev => ({ ...prev, date_from: e.target.value })),
                        placeholder: 'From Date'
                    }),
                    React.createElement('input', {
                        type: 'date',
                        value: filters.date_to,
                        onChange: (e) => setFilters(prev => ({ ...prev, date_to: e.target.value })),
                        placeholder: 'To Date'
                    }),
                    React.createElement('select', {
                        value: filters.status,
                        onChange: (e) => setFilters(prev => ({ ...prev, status: e.target.value }))
                    },
                        React.createElement('option', { value: '' }, 'All Statuses'),
                        React.createElement('option', { value: 'pending' }, 'Pending'),
                        React.createElement('option', { value: 'confirmed' }, 'Confirmed'),
                        React.createElement('option', { value: 'cancelled' }, 'Cancelled'),
                        React.createElement('option', { value: 'refunded' }, 'Refunded')
                    )
                ),
                React.createElement('div', { className: 'mwb-bulk-actions' },
                    React.createElement('select', {
                        value: bulkAction,
                        onChange: (e) => setBulkAction(e.target.value)
                    },
                        React.createElement('option', { value: '' }, 'Bulk Actions'),
                        React.createElement('option', { value: 'cancel' }, 'Cancel'),
                        React.createElement('option', { value: 'resend_confirmation' }, 'Resend Confirmation'),
                        React.createElement('option', { value: 'mark_claimed' }, 'Mark as Claimed')
                    ),
                    React.createElement('button', {
                        className: 'button',
                        onClick: handleBulkAction,
                        disabled: !bulkAction || selectedBookings.length === 0
                    }, 'Apply'),
                    React.createElement('button', {
                        className: 'button',
                        onClick: () => handleExport('csv')
                    }, 'Export CSV')
                )
            ),

            loading ? React.createElement(LoadingSpinner) :
                React.createElement('div', { className: 'mwb-bookings-table-wrapper' },
                    React.createElement('table', { className: 'wp-list-table widefat fixed striped' },
                        React.createElement('thead', null,
                            React.createElement('tr', null,
                                React.createElement('td', { className: 'manage-column column-cb check-column' },
                                    React.createElement('input', {
                                        type: 'checkbox',
                                        onChange: (e) => {
                                            if (e.target.checked) {
                                                setSelectedBookings(bookings.map(b => b.booking_id));
                                            } else {
                                                setSelectedBookings([]);
                                            }
                                        }
                                    })
                                ),
                                React.createElement('th', null, 'Booking ID'),
                                React.createElement('th', null, 'Customer'),
                                React.createElement('th', null, 'Date'),
                                React.createElement('th', null, 'Tickets'),
                                React.createElement('th', null, 'Amount'),
                                React.createElement('th', null, 'Status'),
                                React.createElement('th', null, 'Actions')
                            )
                        ),
                        React.createElement('tbody', null,
                            bookings.map(booking =>
                                React.createElement('tr', { key: booking.id },
                                    React.createElement('th', { className: 'check-column' },
                                        React.createElement('input', {
                                            type: 'checkbox',
                                            checked: selectedBookings.includes(booking.booking_id),
                                            onChange: (e) => {
                                                if (e.target.checked) {
                                                    setSelectedBookings(prev => [...prev, booking.booking_id]);
                                                } else {
                                                    setSelectedBookings(prev => prev.filter(id => id !== booking.booking_id));
                                                }
                                            }
                                        })
                                    ),
                                    React.createElement('td', null,
                                        React.createElement('strong', null, booking.booking_id)
                                    ),
                                    React.createElement('td', null,
                                        React.createElement('div', null, booking.customer_name),
                                        React.createElement('div', { className: 'mwb-customer-contact' },
                                            booking.customer_email
                                        )
                                    ),
                                    React.createElement('td', null, utils.formatDate(booking.booking_date)),
                                    React.createElement('td', null, booking.total_tickets || 
                                        (parseInt(booking.general_tickets || 0) + 
                                         parseInt(booking.child_tickets || 0) + 
                                         parseInt(booking.senior_tickets || 0))
                                    ),
                                    React.createElement('td', null, utils.formatCurrency(booking.total_amount)),
                                    React.createElement('td', null,
                                        React.createElement('span', { 
                                            className: `mwb-status-badge ${booking.booking_status}` 
                                        }, booking.booking_status)
                                    ),
                                    React.createElement('td', null,
                                        React.createElement('div', { className: 'mwb-booking-actions' },
                                            React.createElement('button', {
                                                className: 'button button-small',
                                                onClick: () => window.open(`${marineWorldAdmin.restUrl}booking/${booking.booking_id}`, '_blank')
                                            }, 'View'),
                                            booking.booking_status === 'confirmed' && 
                                                React.createElement('button', {
                                                    className: 'button button-small',
                                                    onClick: async () => {
                                                        try {
                                                            await adminApi.bulkActionBookings([booking.booking_id], 'resend_confirmation');
                                                            alert('Confirmation resent successfully');
                                                        } catch (error) {
                                                            alert('Failed to resend confirmation');
                                                        }
                                                    }
                                                }, 'Resend')
                                        )
                                    )
                                )
                            )
                        )
                    )
                ),

            React.createElement('div', { className: 'mwb-pagination' },
                pagination.current > 1 &&
                    React.createElement('button', {
                        className: 'button',
                        onClick: () => loadBookings(pagination.current - 1)
                    }, 'Previous'),
                React.createElement('span', { className: 'mwb-pagination-info' },
                    `Page ${pagination.current} of ${pagination.total}`
                ),
                pagination.current < pagination.total &&
                    React.createElement('button', {
                        className: 'button',
                        onClick: () => loadBookings(pagination.current + 1)
                    }, 'Next')
            )
        );
    };

    // Availability Management Component
    const AvailabilityManagement = () => {
        const [availability, setAvailability] = useState([]);
        const [loading, setLoading] = useState(true);
        const [selectedLocation, setSelectedLocation] = useState(marineWorldAdmin.locations[0]?.id || 1);
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
                
                const data = await adminApi.getAvailabilityData(
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
                await adminApi.updateAvailability(
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
                                utils.formatCurrency(dayData.special_pricing)
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
                        marineWorldAdmin.locations.map(location =>
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
                    React.createElement('h3', null, `Edit Availability - ${utils.formatDate(editingDate)}`),
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

    // Locations Management Component
    const LocationsManagement = () => {
        const [locations, setLocations] = useState([]);
        const [loading, setLoading] = useState(true);
        const [search, setSearch] = useState('');
        const [statusFilter, setStatusFilter] = useState('');
        const [selectedLocations, setSelectedLocations] = useState([]);
        const [bulkAction, setBulkAction] = useState('');
        const [showForm, setShowForm] = useState(false);
        const [editingLocation, setEditingLocation] = useState(null);
        const [showStats, setShowStats] = useState(null);
        const [locationStats, setLocationStats] = useState(null);

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
                saturday: '9:00 AM - 7:00 PM',
                sunday: '9:00 AM - 7:00 PM'
            },
            facilities: []
        });

        const [newFacility, setNewFacility] = useState('');

        const loadLocations = useCallback(async () => {
            try {
                setLoading(true);
                const data = await adminApi.getLocationsList(search, statusFilter);
                setLocations(data);
            } catch (error) {
                console.error('Failed to load locations:', error);
            } finally {
                setLoading(false);
            }
        }, [search, statusFilter]);

        const debouncedSearch = useCallback(
            utils.debounce(() => loadLocations(), 500),
            [loadLocations]
        );

        useEffect(() => {
            debouncedSearch();
        }, [debouncedSearch]);

        const resetForm = () => {
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
                    saturday: '9:00 AM - 7:00 PM',
                    sunday: '9:00 AM - 7:00 PM'
                },
                facilities: []
            });
            setEditingLocation(null);
            setNewFacility('');
        };

        const handleAddLocation = () => {
            resetForm();
            setShowForm(true);
        };

        const handleEditLocation = async (locationId) => {
            try {
                const location = await adminApi.getLocation(locationId);
                setFormData({
                    ...location,
                    timings: location.timings || {
                        monday: '9:00 AM - 6:00 PM',
                        tuesday: '9:00 AM - 6:00 PM',
                        wednesday: '9:00 AM - 6:00 PM',
                        thursday: '9:00 AM - 6:00 PM',
                        friday: '9:00 AM - 6:00 PM',
                        saturday: '9:00 AM - 7:00 PM',
                        sunday: '9:00 AM - 7:00 PM'
                    },
                    facilities: location.facilities || []
                });
                setEditingLocation(locationId);
                setShowForm(true);
            } catch (error) {
                alert('Failed to load location details: ' + error.message);
            }
        };

        const handleSaveLocation = async () => {
            try {
                const saveData = {
                    ...formData,
                    location_id: editingLocation || 0
                };
                
                await adminApi.saveLocation(saveData);
                setShowForm(false);
                resetForm();
                loadLocations();
                alert(editingLocation ? 'Location updated successfully' : 'Location created successfully');
            } catch (error) {
                alert('Failed to save location: ' + error.message);
            }
        };

        const handleDeleteLocation = async (locationId) => {
            if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
                return;
            }

            try {
                await adminApi.deleteLocation(locationId);
                loadLocations();
                alert('Location deleted successfully');
            } catch (error) {
                alert('Failed to delete location: ' + error.message);
            }
        };

        const handleBulkAction = async () => {
            if (!bulkAction || selectedLocations.length === 0) return;

            if (bulkAction === 'delete' && !confirm('Are you sure you want to delete the selected locations?')) {
                return;
            }

            try {
                await adminApi.bulkActionLocations(selectedLocations, bulkAction);
                setSelectedLocations([]);
                setBulkAction('');
                loadLocations();
                alert('Bulk action completed successfully');
            } catch (error) {
                alert('Bulk action failed: ' + error.message);
            }
        };

        const handleShowStats = async (locationId) => {
            try {
                const dateFrom = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
                const dateTo = new Date().toISOString().split('T')[0];
                
                const stats = await adminApi.getLocationStats(locationId, dateFrom, dateTo);
                setLocationStats(stats);
                setShowStats(locationId);
            } catch (error) {
                alert('Failed to load location stats: ' + error.message);
            }
        };

        const addFacility = () => {
            if (newFacility.trim() && !formData.facilities.includes(newFacility.trim())) {
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
                                ),
                                location.facilities && location.facilities.length > 0 &&
                                    React.createElement('div', { className: 'mwb-location-facilities' },
                                        React.createElement('strong', null, 'Facilities: '),
                                        React.createElement('div', { className: 'mwb-facilities-tags' },
                                            location.facilities.slice(0, 3).map((facility, index) =>
                                                React.createElement('span', { 
                                                    key: index, 
                                                    className: 'mwb-facility-tag' 
                                                }, facility)
                                            ),
                                            location.facilities.length > 3 &&
                                                React.createElement('span', { className: 'mwb-facility-more' }, 
                                                    `+${location.facilities.length - 3} more`
                                                )
                                        )
                                    )
                            ),
                            React.createElement('div', { className: 'mwb-location-stats' },
                                React.createElement('div', { className: 'mwb-stat-item' },
                                    React.createElement('span', { className: 'mwb-stat-label' }, 'Total Bookings'),
                                    React.createElement('span', { className: 'mwb-stat-value' }, location.total_bookings || 0)
                                ),
                                React.createElement('div', { className: 'mwb-stat-item' },
                                    React.createElement('span', { className: 'mwb-stat-label' }, 'Revenue'),
                                    React.createElement('span', { className: 'mwb-stat-value' }, 
                                        utils.formatCurrency(location.total_revenue || 0)
                                    )
                                ),
                                React.createElement('div', { className: 'mwb-stat-item' },
                                    React.createElement('span', { className: 'mwb-stat-label' }, 'Recent Bookings'),
                                    React.createElement('span', { className: 'mwb-stat-value' }, location.recent_bookings || 0)
                                )
                            ),
                            React.createElement('div', { className: 'mwb-location-actions' },
                                React.createElement('button', {
                                    className: 'button button-small',
                                    onClick: () => handleEditLocation(location.id)
                                }, 'Edit'),
                                React.createElement('button', {
                                    className: 'button button-small',
                                    onClick: () => handleShowStats(location.id)
                                }, 'Stats'),
                                React.createElement('button', {
                                    className: 'button button-small button-link-delete',
                                    onClick: () => handleDeleteLocation(location.id)
                                }, 'Delete')
                            )
                        )
                    )
                ),

            // Location Form Modal
            showForm && React.createElement('div', { className: 'mwb-modal-overlay' },
                React.createElement('div', { className: 'mwb-modal-content mwb-location-form-modal' },
                    React.createElement('div', { className: 'mwb-modal-header' },
                        React.createElement('h2', null, editingLocation ? 'Edit Location' : 'Add New Location'),
                        React.createElement('button', {
                            className: 'mwb-modal-close',
                            onClick: () => setShowForm(false)
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
                                React.createElement('label', null, 'Pincode'),
                                React.createElement('input', {
                                    type: 'text',
                                    value: formData.pincode,
                                    onChange: (e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))
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

                        // Operating Hours Section
                        React.createElement('div', { className: 'mwb-form-section' },
                            React.createElement('h3', null, 'Operating Hours'),
                            React.createElement('div', { className: 'mwb-timings-grid' },
                                Object.keys(formData.timings).map(day =>
                                    React.createElement('div', { key: day, className: 'mwb-timing-row' },
                                        React.createElement('label', null, day.charAt(0).toUpperCase() + day.slice(1)),
                                        React.createElement('input', {
                                            type: 'text',
                                            value: formData.timings[day],
                                            onChange: (e) => setFormData(prev => ({
                                                ...prev,
                                                timings: { ...prev.timings, [day]: e.target.value }
                                            })),
                                            placeholder: 'e.g., 9:00 AM - 6:00 PM'
                                        })
                                    )
                                )
                            )
                        ),

                        // Facilities Section
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
                            onClick: () => setShowForm(false)
                        }, 'Cancel'),
                        React.createElement('button', {
                            className: 'button button-primary',
                            onClick: handleSaveLocation
                        }, editingLocation ? 'Update Location' : 'Create Location')
                    )
                )
            ),

            // Location Stats Modal
            showStats && React.createElement('div', { className: 'mwb-modal-overlay' },
                React.createElement('div', { className: 'mwb-modal-content mwb-stats-modal' },
                    React.createElement('div', { className: 'mwb-modal-header' },
                        React.createElement('h2', null, 'Location Statistics'),
                        React.createElement('button', {
                            className: 'mwb-modal-close',
                            onClick: () => setShowStats(null)
                        }, '×')
                    ),
                    React.createElement('div', { className: 'mwb-modal-body' },
                        locationStats && React.createElement('div', { className: 'mwb-stats-content' },
                            React.createElement('div', { className: 'mwb-stats-overview' },
                                React.createElement(StatsCard, {
                                    title: 'Total Bookings',
                                    value: locationStats.stats?.total_bookings || 0,
                                    icon: 'dashicons-calendar-alt'
                                }),
                                React.createElement(StatsCard, {
                                    title: 'Total Revenue',
                                    value: utils.formatCurrency(locationStats.stats?.total_revenue || 0),
                                    icon: 'dashicons-money-alt'
                                }),
                                React.createElement(StatsCard, {
                                    title: 'Total Tickets',
                                    value: locationStats.stats?.total_tickets || 0,
                                    icon: 'dashicons-tickets-alt'
                                }),
                                React.createElement(StatsCard, {
                                    title: 'Average Booking Value',
                                    value: utils.formatCurrency(locationStats.stats?.average_booking_value || 0),
                                    icon: 'dashicons-chart-line'
                                })
                            ),
                            locationStats.utilization && locationStats.utilization.length > 0 &&
                                React.createElement('div', { className: 'mwb-utilization-chart' },
                                    React.createElement('h3', null, 'Capacity Utilization'),
                                    React.createElement('div', { className: 'mwb-utilization-list' },
                                        locationStats.utilization.slice(-7).map(day =>
                                            React.createElement('div', { 
                                                key: day.availability_date, 
                                                className: 'mwb-utilization-item' 
                                            },
                                                React.createElement('span', { className: 'mwb-util-date' },
                                                    utils.formatDate(day.availability_date)
                                                ),
                                                React.createElement('div', { className: 'mwb-util-bar' },
                                                    React.createElement('div', { 
                                                        className: 'mwb-util-fill',
                                                        style: { width: `${day.utilization_percentage}%` }
                                                    })
                                                ),
                                                React.createElement('span', { className: 'mwb-util-percentage' },
                                                    `${day.utilization_percentage}%`
                                                )
                                            )
                                        )
                                    )
                                )
                        )
                    )
                )
            )
        );
    };

    // Add-ons Management Component
    const AddonsManagement = () => {
        const [addons, setAddons] = useState([]);
        const [loading, setLoading] = useState(true);
        const [search, setSearch] = useState('');
        const [statusFilter, setStatusFilter] = useState('');
        const [selectedAddons, setSelectedAddons] = useState([]);
        const [bulkAction, setBulkAction] = useState('');
        const [showForm, setShowForm] = useState(false);
        const [editingAddon, setEditingAddon] = useState(null);
        const [showStats, setShowStats] = useState(null);
        const [addonStats, setAddonStats] = useState(null);
        const [draggedItem, setDraggedItem] = useState(null);

        const [formData, setFormData] = useState({
            name: '',
            description: '',
            price: '',
            status: 'active',
            display_order: 0,
            image_url: ''
        });
        
        const [selectedImage, setSelectedImage] = useState(null);
        const [imagePreview, setImagePreview] = useState('');

        const loadAddons = useCallback(async () => {
            try {
                setLoading(true);
                const data = await adminApi.getAddonsList(search, statusFilter);
                setAddons(data);
            } catch (error) {
                console.error('Failed to load add-ons:', error);
            } finally {
                setLoading(false);
            }
        }, [search, statusFilter]);

        const debouncedSearch = useCallback(
            utils.debounce(() => loadAddons(), 500),
            [loadAddons]
        );

        useEffect(() => {
            debouncedSearch();
        }, [debouncedSearch]);

        const resetForm = () => {
            setFormData({
                name: '',
                description: '',
                price: '',
                status: 'active',
                display_order: 0,
                image_url: ''
            });
            setEditingAddon(null);
            setSelectedImage(null);
            setImagePreview('');
        };

        const handleAddAddon = () => {
            resetForm();
            setShowForm(true);
        };

        const handleEditAddon = async (addonId) => {
            try {
                const addon = await adminApi.getAddon(addonId);
                setFormData(addon);
                setEditingAddon(addonId);
                setImagePreview(addon.image_url || '');
                setSelectedImage(null);
                setShowForm(true);
            } catch (error) {
                alert('Failed to load add-on details: ' + error.message);
            }
        };

        const handleImageChange = (e) => {
            const file = e.target.files[0];
            if (file) {
                setSelectedImage(file);
                
                // Create preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    setImagePreview(e.target.result);
                };
                reader.readAsDataURL(file);
            }
        };

        const handleRemoveImage = () => {
            setSelectedImage(null);
            setImagePreview('');
            setFormData(prev => ({ ...prev, image_url: '' }));
        };

        const handleSaveAddon = async () => {
            try {
                const saveData = {
                    ...formData,
                    addon_id: editingAddon || 0
                };
                
                // If there's a selected image, include it
                if (selectedImage) {
                    saveData.image = selectedImage;
                }
                
                console.log('Saving addon with data:', saveData); // Debug log
                
                await adminApi.saveAddon(saveData);
                setShowForm(false);
                resetForm();
                loadAddons();
                alert(editingAddon ? 'Add-on updated successfully' : 'Add-on created successfully');
            } catch (error) {
                console.error('Save addon error:', error); // Debug log
                alert('Failed to save add-on: ' + error.message);
            }
        };

        const handleDeleteAddon = async (addonId) => {
            if (!confirm('Are you sure you want to delete this add-on? This action cannot be undone.')) {
                return;
            }

            try {
                await adminApi.deleteAddon(addonId);
                loadAddons();
                alert('Add-on deleted successfully');
            } catch (error) {
                alert('Failed to delete add-on: ' + error.message);
            }
        };

        const handleBulkAction = async () => {
            if (!bulkAction || selectedAddons.length === 0) return;

            if (bulkAction === 'delete' && !confirm('Are you sure you want to delete the selected add-ons?')) {
                return;
            }

            try {
                await adminApi.bulkActionAddons(selectedAddons, bulkAction);
                setSelectedAddons([]);
                setBulkAction('');
                loadAddons();
                alert('Bulk action completed successfully');
            } catch (error) {
                alert('Bulk action failed: ' + error.message);
            }
        };

        const handleShowStats = async (addonId = null) => {
            try {
                const dateFrom = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
                const dateTo = new Date().toISOString().split('T')[0];
                
                const stats = await adminApi.getAddonStats(addonId, dateFrom, dateTo);
                setAddonStats(stats);
                setShowStats(addonId || 'all');
            } catch (error) {
                alert('Failed to load add-on stats: ' + error.message);
            }
        };

        const handleDragStart = (e, addon) => {
            setDraggedItem(addon);
            e.dataTransfer.effectAllowed = 'move';
        };

        const handleDragOver = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        };

        const handleDrop = async (e, targetAddon) => {
            e.preventDefault();
            
            if (!draggedItem || draggedItem.id === targetAddon.id) {
                setDraggedItem(null);
                return;
            }

            const newAddons = [...addons];
            const draggedIndex = newAddons.findIndex(a => a.id === draggedItem.id);
            const targetIndex = newAddons.findIndex(a => a.id === targetAddon.id);

            // Remove dragged item and insert at new position
            newAddons.splice(draggedIndex, 1);
            newAddons.splice(targetIndex, 0, draggedItem);

            // Update display orders
            const addonOrders = {};
            newAddons.forEach((addon, index) => {
                addonOrders[addon.id] = index + 1;
            });

            try {
                await adminApi.updateAddonOrder(addonOrders);
                setAddons(newAddons);
                setDraggedItem(null);
            } catch (error) {
                alert('Failed to update add-on order: ' + error.message);
                setDraggedItem(null);
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
                    React.createElement('button', {
                        className: 'button',
                        onClick: () => handleShowStats()
                    }, 'View Statistics'),
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
                    React.createElement('div', { className: 'mwb-addons-note' },
                        React.createElement('p', null, '💡 Drag and drop add-ons to reorder them. The order here determines how they appear in the booking form.')
                    ),
                    addons.map(addon =>
                        React.createElement('div', { 
                            key: addon.id, 
                            className: `mwb-addon-card ${addon.status}`,
                            draggable: true,
                            onDragStart: (e) => handleDragStart(e, addon),
                            onDragOver: handleDragOver,
                            onDrop: (e) => handleDrop(e, addon)
                        },
                            React.createElement('div', { className: 'mwb-addon-header' },
                                React.createElement('div', { className: 'mwb-addon-drag-handle' },
                                    React.createElement('span', { className: 'dashicons dashicons-menu' })
                                ),
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
                            addon.image_url && React.createElement('img', {
                                src: addon.image_url,
                                alt: addon.name,
                                className: 'mwb-addon-image-preview'
                            }),
                            React.createElement('div', { className: 'mwb-addon-details' },
                                React.createElement('div', { className: 'mwb-addon-description' },
                                    addon.description || 'No description provided'
                                ),
                                React.createElement('div', { className: 'mwb-addon-price' },
                                    React.createElement('strong', null, 'Price: '),
                                    React.createElement('span', { className: 'mwb-price-value' }, 
                                        utils.formatCurrency(addon.price)
                                    )
                                ),
                                React.createElement('div', { className: 'mwb-addon-order' },
                                    React.createElement('strong', null, 'Display Order: '),
                                    React.createElement('span', null, addon.display_order)
                                )
                            ),
                            React.createElement('div', { className: 'mwb-addon-stats' },
                                React.createElement('div', { className: 'mwb-stat-item' },
                                    React.createElement('span', { className: 'mwb-stat-label' }, 'Total Bookings'),
                                    React.createElement('span', { className: 'mwb-stat-value' }, addon.total_bookings || 0)
                                ),
                                React.createElement('div', { className: 'mwb-stat-item' },
                                    React.createElement('span', { className: 'mwb-stat-label' }, 'Total Quantity'),
                                    React.createElement('span', { className: 'mwb-stat-value' }, addon.total_quantity || 0)
                                ),
                                React.createElement('div', { className: 'mwb-stat-item' },
                                    React.createElement('span', { className: 'mwb-stat-label' }, 'Revenue'),
                                    React.createElement('span', { className: 'mwb-stat-value' }, 
                                        utils.formatCurrency((addon.total_quantity || 0) * addon.price)
                                    )
                                )
                            ),
                            React.createElement('div', { className: 'mwb-addon-actions' },
                                React.createElement('button', {
                                    className: 'button button-small',
                                    onClick: () => handleEditAddon(addon.id)
                                }, 'Edit'),
                                React.createElement('button', {
                                    className: 'button button-small',
                                    onClick: () => handleShowStats(addon.id)
                                }, 'Stats'),
                                React.createElement('button', {
                                    className: 'button button-small button-link-delete',
                                    onClick: () => handleDeleteAddon(addon.id)
                                }, 'Delete')
                            )
                        )
                    )
                ),

            // Add-on Form Modal
            showForm && React.createElement('div', { className: 'mwb-modal-overlay' },
                React.createElement('div', { className: 'mwb-modal-content mwb-addon-form-modal' },
                    React.createElement('div', { className: 'mwb-modal-header' },
                        React.createElement('h2', null, editingAddon ? 'Edit Add-on' : 'Add New Add-on'),
                        React.createElement('button', {
                            className: 'mwb-modal-close',
                            onClick: () => setShowForm(false)
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
                                    required: true,
                                    placeholder: 'e.g., Horror House 16D'
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Price *'),
                                React.createElement('input', {
                                    type: 'number',
                                    step: '0.01',
                                    min: '0',
                                    value: formData.price,
                                    onChange: (e) => setFormData(prev => ({ ...prev, price: e.target.value })),
                                    required: true,
                                    placeholder: '0.00'
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
                            React.createElement('div', { className: 'mwb-form-group' },
                                React.createElement('label', null, 'Display Order'),
                                React.createElement('input', {
                                    type: 'number',
                                    min: '0',
                                    value: formData.display_order,
                                    onChange: (e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 })),
                                    placeholder: 'Leave 0 for automatic ordering'
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group mwb-form-group-full' },
                                React.createElement('label', null, 'Description'),
                                React.createElement('textarea', {
                                    value: formData.description,
                                    onChange: (e) => setFormData(prev => ({ ...prev, description: e.target.value })),
                                    rows: 4,
                                    placeholder: 'Describe what this add-on includes...'
                                })
                            ),
                            React.createElement('div', { className: 'mwb-form-group mwb-form-group-full' },
                                React.createElement('label', null, 'Add-on Image'),
                                React.createElement('div', { className: 'mwb-image-upload-container' },
                                    !imagePreview ? 
                                        React.createElement('div', { className: 'mwb-image-upload-area' },
                                            React.createElement('input', {
                                                type: 'file',
                                                accept: 'image/*',
                                                onChange: handleImageChange,
                                                id: 'addon-image-upload',
                                                style: { display: 'none' }
                                            }),
                                            React.createElement('label', {
                                                htmlFor: 'addon-image-upload',
                                                className: 'mwb-upload-button'
                                            },
                                                React.createElement('div', { className: 'mwb-upload-icon' }, '📷'),
                                                React.createElement('div', null, 'Click to upload image'),
                                                React.createElement('small', null, 'Recommended: 400x300px, max 2MB')
                                            )
                                        ) :
                                        React.createElement('div', { className: 'mwb-image-preview-container' },
                                            React.createElement('img', {
                                                src: imagePreview,
                                                alt: 'Add-on preview',
                                                className: 'mwb-image-preview'
                                            }),
                                            React.createElement('div', { className: 'mwb-image-actions' },
                                                React.createElement('input', {
                                                    type: 'file',
                                                    accept: 'image/*',
                                                    onChange: handleImageChange,
                                                    id: 'addon-image-replace',
                                                    style: { display: 'none' }
                                                }),
                                                React.createElement('label', {
                                                    htmlFor: 'addon-image-replace',
                                                    className: 'button button-small'
                                                }, 'Replace Image'),
                                                React.createElement('button', {
                                                    type: 'button',
                                                    className: 'button button-small button-link-delete',
                                                    onClick: handleRemoveImage
                                                }, 'Remove Image')
                                            )
                                        )
                                )
                            )
                        )
                    ),
                    React.createElement('div', { className: 'mwb-modal-footer' },
                        React.createElement('button', {
                            className: 'button',
                            onClick: () => setShowForm(false)
                        }, 'Cancel'),
                        React.createElement('button', {
                            className: 'button button-primary',
                            onClick: handleSaveAddon
                        }, editingAddon ? 'Update Add-on' : 'Create Add-on')
                    )
                )
            ),

            // Add-on Stats Modal
            showStats && React.createElement('div', { className: 'mwb-modal-overlay' },
                React.createElement('div', { className: 'mwb-modal-content mwb-stats-modal' },
                    React.createElement('div', { className: 'mwb-modal-header' },
                        React.createElement('h2', null, showStats === 'all' ? 'All Add-ons Statistics' : 'Add-on Statistics'),
                        React.createElement('button', {
                            className: 'mwb-modal-close',
                            onClick: () => setShowStats(null)
                        }, '×')
                    ),
                    React.createElement('div', { className: 'mwb-modal-body' },
                        addonStats && React.createElement('div', { className: 'mwb-stats-content' },
                            showStats === 'all' ? 
                                // All add-ons stats
                                React.createElement('div', null,
                                    React.createElement('div', { className: 'mwb-stats-overview' },
                                        React.createElement(StatsCard, {
                                            title: 'Total Revenue',
                                            value: utils.formatCurrency(addonStats.totals?.revenue || 0),
                                            icon: 'dashicons-money-alt'
                                        }),
                                        React.createElement(StatsCard, {
                                            title: 'Total Bookings',
                                            value: addonStats.totals?.bookings || 0,
                                            icon: 'dashicons-calendar-alt'
                                        }),
                                        React.createElement(StatsCard, {
                                            title: 'Total Quantity',
                                            value: addonStats.totals?.quantity || 0,
                                            icon: 'dashicons-tickets-alt'
                                        })
                                    ),
                                    React.createElement('div', { className: 'mwb-addons-breakdown' },
                                        React.createElement('h3', null, 'Add-ons Performance'),
                                        React.createElement('div', { className: 'mwb-addons-stats-list' },
                                            addonStats.addons?.map(item =>
                                                React.createElement('div', { 
                                                    key: item.addon.id, 
                                                    className: 'mwb-addon-stat-item' 
                                                },
                                                    React.createElement('div', { className: 'mwb-addon-stat-name' },
                                                        item.addon.name
                                                    ),
                                                    React.createElement('div', { className: 'mwb-addon-stat-values' },
                                                        React.createElement('span', null, `${item.stats.total_bookings} bookings`),
                                                        React.createElement('span', null, `${item.stats.total_quantity} qty`),
                                                        React.createElement('span', { className: 'mwb-addon-revenue' }, 
                                                            utils.formatCurrency(item.revenue)
                                                        )
                                                    )
                                                )
                                            ) || []
                                        )
                                    )
                                ) :
                                // Single add-on stats
                                React.createElement('div', null,
                                    React.createElement('div', { className: 'mwb-addon-info' },
                                        React.createElement('h3', null, addonStats.addon?.name),
                                        React.createElement('p', null, `Price: ${utils.formatCurrency(addonStats.addon?.price || 0)}`)
                                    ),
                                    React.createElement('div', { className: 'mwb-stats-overview' },
                                        React.createElement(StatsCard, {
                                            title: 'Total Bookings',
                                            value: addonStats.stats?.total_bookings || 0,
                                            icon: 'dashicons-calendar-alt'
                                        }),
                                        React.createElement(StatsCard, {
                                            title: 'Total Quantity',
                                            value: addonStats.stats?.total_quantity || 0,
                                            icon: 'dashicons-tickets-alt'
                                        }),
                                        React.createElement(StatsCard, {
                                            title: 'Total Revenue',
                                            value: utils.formatCurrency(addonStats.revenue || 0),
                                            icon: 'dashicons-money-alt'
                                        })
                                    )
                                )
                        )
                    )
                )
            )
        );
    };

    // Initialize admin components based on current page
    document.addEventListener('DOMContentLoaded', function() {
        // Only run if we're in WordPress admin and have admin data
        if (typeof marineWorldAdmin === 'undefined' || !marineWorldAdmin.currentPage) {
            return; // Exit if not in admin context
        }
        
        const currentPage = marineWorldAdmin.currentPage;

        switch (currentPage) {
            case 'marine-world-booking':
                const dashboardElement = document.getElementById('mwb-admin-dashboard');
                if (dashboardElement) {
                    render(React.createElement(Dashboard), dashboardElement);
                }
                break;

            case 'marine-world-bookings':
                const bookingsElement = document.getElementById('mwb-bookings-dashboard');
                if (bookingsElement) {
                    render(React.createElement(BookingsManagement), bookingsElement);
                }
                break;

            case 'marine-world-availability':
                const availabilityElement = document.getElementById('mwb-availability-dashboard');
                if (availabilityElement) {
                    render(React.createElement(AvailabilityManagement), availabilityElement);
                }
                break;

            case 'marine-world-locations':
                const locationsElement = document.getElementById('mwb-locations-dashboard');
                if (locationsElement) {
                    render(React.createElement(LocationsManagement), locationsElement);
                }
                break;

            case 'marine-world-addons':
                const addonsElement = document.getElementById('mwb-addons-dashboard');
                if (addonsElement) {
                    render(React.createElement(AddonsManagement), addonsElement);
                }
                break;

            case 'mwb-pricing':
                const pricingElement = document.getElementById('mwb-pricing-dashboard');
                if (pricingElement) {
                    render(React.createElement(PricingDashboard), pricingElement);
                }
                break;

            // Add more cases for other admin pages as needed
        }
    });

// Pricing Dashboard Component
const PricingDashboard = () => {
    const [prices, setPrices] = useState({
        general: 400,
        child: 280,
        senior: 350
    });
    const [birthdayDiscountRate, setBirthdayDiscountRate] = useState(10);
    const [seasonalPricing, setSeasonalPricing] = useState([]);
    const [dynamicPricingEnabled, setDynamicPricingEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');

    useEffect(() => {
        loadPricingData();
    }, []);

    const loadPricingData = async () => {
        try {
            setLoading(true);
            const data = await adminApi.getTicketPrices();
            setPrices(data.prices);
            setBirthdayDiscountRate(data.birthday_discount_rate || 10);
            setSeasonalPricing(data.seasonal_pricing || []);
            setDynamicPricingEnabled(data.dynamic_pricing_enabled || false);
        } catch (error) {
            console.error('Failed to load pricing data:', error);
        } finally {
            setLoading(false);
        }
    };

    const updatePrice = (type, value) => {
        const numericValue = parseFloat(value) || 0;
        setPrices(prev => ({
            ...prev,
            [type]: numericValue
        }));
    };

    const savePricing = async () => {
        try {
            setSaving(true);
            
            await adminApi.updateTicketPrices({
                prices,
                birthday_discount_rate: birthdayDiscountRate,
                seasonal_pricing: seasonalPricing,
                dynamic_pricing_enabled: dynamicPricingEnabled
            });
            
            alert('Pricing updated successfully!');
        } catch (error) {
            console.error('Failed to save pricing:', error);
            alert('Failed to save pricing');
        } finally {
            setSaving(false);
        }
    };

    const resetPricing = async () => {
        if (!confirm('Are you sure you want to reset to default prices?')) {
            return;
        }

        try {
            setSaving(true);
            const data = await adminApi.resetTicketPrices();
            setPrices(data.prices);
            setSeasonalPricing([]);
            setDynamicPricingEnabled(false);
            alert('Pricing reset to defaults');
        } catch (error) {
            console.error('Failed to reset pricing:', error);
            alert('Failed to reset pricing');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return React.createElement('div', { className: 'mwb-loading' }, 'Loading pricing data...');
    }

    return React.createElement('div', { className: 'mwb-pricing-dashboard' },
        React.createElement('div', { className: 'mwb-dashboard-header', style: { marginBottom: '20px' } },
            React.createElement('div', { className: 'mwb-header-actions' },
                React.createElement('button', {
                    className: 'button button-secondary',
                    onClick: resetPricing,
                    disabled: saving
                }, 'Reset to Defaults'),
                React.createElement('button', {
                    className: 'button button-primary',
                    onClick: savePricing,
                    disabled: saving
                }, saving ? 'Saving...' : 'Save Changes')
            )
        ),

        React.createElement('div', { className: 'nav-tab-wrapper' },
            React.createElement('a', {
                className: `nav-tab ${activeTab === 'basic' ? 'nav-tab-active' : ''}`,
                onClick: () => setActiveTab('basic'),
                href: '#'
            }, 'Basic Pricing'),
            React.createElement('a', {
                className: `nav-tab ${activeTab === 'settings' ? 'nav-tab-active' : ''}`,
                onClick: () => setActiveTab('settings'),
                href: '#'
            }, 'Settings')
        ),

        // Basic Pricing Tab
        activeTab === 'basic' && React.createElement('div', { style: { padding: '20px' } },
            React.createElement('table', { className: 'form-table' },
                React.createElement('tr', null,
                    React.createElement('th', { scope: 'row' }, 'General Admission'),
                    React.createElement('td', null,
                        '₹ ',
                        React.createElement('input', {
                            type: 'number',
                            value: prices.general,
                            onChange: (e) => updatePrice('general', e.target.value),
                            min: '0',
                            step: '0.01'
                        })
                    )
                ),
                React.createElement('tr', null,
                    React.createElement('th', { scope: 'row' }, 'Child Ticket'),
                    React.createElement('td', null,
                        '₹ ',
                        React.createElement('input', {
                            type: 'number',
                            value: prices.child,
                            onChange: (e) => updatePrice('child', e.target.value),
                            min: '0',
                            step: '0.01'
                        })
                    )
                ),
                React.createElement('tr', null,
                    React.createElement('th', { scope: 'row' }, 'Senior Citizen'),
                    React.createElement('td', null,
                        '₹ ',
                        React.createElement('input', {
                            type: 'number',
                            value: prices.senior,
                            onChange: (e) => updatePrice('senior', e.target.value),
                            min: '0',
                            step: '0.01'
                        })
                    )
                ),
                React.createElement('tr', null,
                    React.createElement('th', { scope: 'row' }, 'Birthday Offer Discount'),
                    React.createElement('td', null,
                        React.createElement('input', {
                            type: 'number',
                            value: birthdayDiscountRate,
                            onChange: (e) => setBirthdayDiscountRate(parseFloat(e.target.value) || 0),
                            min: '0',
                            max: '100',
                            step: '1'
                        }),
                        ' %',
                        React.createElement('p', { className: 'description' }, 
                            'Percentage discount for birthday offer tickets'
                        )
                    )
                )
            )
        ),

        // Settings Tab
        activeTab === 'settings' && React.createElement('div', { style: { padding: '20px' } },
            React.createElement('table', { className: 'form-table' },
                React.createElement('tr', null,
                    React.createElement('th', { scope: 'row' }, 'Enable Dynamic Pricing'),
                    React.createElement('td', null,
                        React.createElement('label', null,
                            React.createElement('input', {
                                type: 'checkbox',
                                checked: dynamicPricingEnabled,
                                onChange: (e) => setDynamicPricingEnabled(e.target.checked)
                            }),
                            ' Enable date-based pricing'
                        ),
                        React.createElement('p', { className: 'description' }, 
                            'When enabled, you can set different prices for different dates.'
                        )
                    )
                )
            )
        )
    );
};

// Add methods to adminApi object
adminApi.getTicketPrices = function() {
    return this.request('mwb_get_ticket_prices');
};

adminApi.updateTicketPrices = function(pricingData) {
    return this.request('mwb_update_ticket_prices', {
        prices: pricingData.prices,
        birthday_discount_rate: pricingData.birthday_discount_rate,
        seasonal_pricing: pricingData.seasonal_pricing,
        dynamic_pricing_enabled: pricingData.dynamic_pricing_enabled
    });
};

adminApi.resetTicketPrices = function() {
    return this.request('mwb_reset_ticket_prices');
};

// Promo code API methods
adminApi.getPromoCodesList = function(page = 1, perPage = 20, search = '', status = '') {
    return this.request('mwb_get_promo_codes_list', {
        page,
        per_page: perPage,
        search,
        status
    });
};

adminApi.getPromoCode = function(promoId) {
    return this.request('mwb_get_promo_code', {
        promo_id: promoId
    });
};

adminApi.savePromoCode = function(promoData) {
    return this.request('mwb_save_promo_code', promoData);
};

adminApi.deletePromoCode = function(promoId) {
    return this.request('mwb_delete_promo_code', {
        promo_id: promoId
    });
};

adminApi.bulkActionPromoCodes = function(action, promoIds) {
    return this.request('mwb_bulk_action_promo_codes', {
        action,
        promo_ids: promoIds
    });
};

// Promo Codes Management Component
const PromoCodesManagement = () => {
    const [promoCodes, setPromoCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedCodes, setSelectedCodes] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingCode, setEditingCode] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    const loadPromoCodes = useCallback(async (page = 1, search = '', status = '') => {
        try {
            setLoading(true);
            const response = await adminApi.getPromoCodesList(page, 20, search, status);
            setPromoCodes(response.promo_codes || []);
            setTotalPages(response.total_pages || 1);
            setCurrentPage(page);
        } catch (error) {
            console.error('Error loading promo codes:', error);
            setMessage({ type: 'error', text: 'Failed to load promo codes' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPromoCodes();
    }, [loadPromoCodes]);

    const handleSearch = (e) => {
        e.preventDefault();
        loadPromoCodes(1, searchTerm, statusFilter);
    };

    const handleStatusFilter = (status) => {
        setStatusFilter(status);
        loadPromoCodes(1, searchTerm, status);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedCodes(promoCodes.map(code => code.id));
        } else {
            setSelectedCodes([]);
        }
    };

    const handleSelectCode = (codeId) => {
        setSelectedCodes(prev => 
            prev.includes(codeId) 
                ? prev.filter(id => id !== codeId)
                : [...prev, codeId]
        );
    };

    const handleBulkAction = async (action) => {
        if (selectedCodes.length === 0) {
            setMessage({ type: 'error', text: 'Please select promo codes first' });
            return;
        }

        try {
            const response = await adminApi.bulkActionPromoCodes(action, selectedCodes);
            setMessage({ type: 'success', text: response.message });
            setSelectedCodes([]);
            loadPromoCodes(currentPage, searchTerm, statusFilter);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        }
    };

    const handleEdit = async (codeId) => {
        try {
            const response = await adminApi.getPromoCode(codeId);
            setEditingCode(response.promo_code);
            setShowModal(true);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to load promo code' });
        }
    };

    const handleDelete = async (codeId) => {
        if (!confirm('Are you sure you want to delete this promo code?')) return;

        try {
            const response = await adminApi.deletePromoCode(codeId);
            setMessage({ type: 'success', text: response.message });
            loadPromoCodes(currentPage, searchTerm, statusFilter);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    if (loading) {
        return React.createElement('div', { className: 'mwb-loading' }, 'Loading promo codes...');
    }

    return React.createElement('div', { className: 'mwb-promo-codes-management' }, [
        // Header
        React.createElement('div', { key: 'header', className: 'mwb-header', style: { marginBottom: '20px' } }, [
            React.createElement('button', {
                key: 'add-btn',
                className: 'button button-primary',
                onClick: () => { 
                    setEditingCode(null); 
                    setShowModal(true); 
                }
            }, 'Add New Promo Code')
        ]),

        // Message
        message.text && React.createElement('div', {
            key: 'message',
            className: `notice notice-${message.type} is-dismissible`,
            style: { margin: '20px 0' }
        }, [
            React.createElement('p', { key: 'msg-text' }, message.text),
            React.createElement('button', {
                key: 'dismiss',
                className: 'notice-dismiss',
                onClick: () => setMessage({ type: '', text: '' })
            }, 'Dismiss')
        ]),

        // Filters
        React.createElement('div', { key: 'filters', className: 'mwb-filters' }, [
            React.createElement('form', {
                key: 'search-form',
                onSubmit: handleSearch,
                style: { display: 'inline-block', marginRight: '20px' }
            }, [
                React.createElement('input', {
                    key: 'search',
                    type: 'text',
                    placeholder: 'Search promo codes...',
                    value: searchTerm,
                    onChange: (e) => setSearchTerm(e.target.value)
                }),
                React.createElement('button', {
                    key: 'search-btn',
                    type: 'submit',
                    className: 'button'
                }, 'Search')
            ]),
            React.createElement('select', {
                key: 'status-filter',
                value: statusFilter,
                onChange: (e) => handleStatusFilter(e.target.value)
            }, [
                React.createElement('option', { key: 'all', value: '' }, 'All Status'),
                React.createElement('option', { key: 'active', value: 'active' }, 'Active'),
                React.createElement('option', { key: 'inactive', value: 'inactive' }, 'Inactive')
            ])
        ]),

        // Bulk Actions
        React.createElement('div', { key: 'bulk', className: 'mwb-bulk-actions' }, [
            React.createElement('select', {
                key: 'bulk-select',
                onChange: (e) => {
                    if (e.target.value) {
                        handleBulkAction(e.target.value);
                        e.target.value = ''; // Reset dropdown
                    }
                }
            }, [
                React.createElement('option', { key: 'bulk-default', value: '' }, 'Bulk Actions'),
                React.createElement('option', { key: 'bulk-delete', value: 'delete' }, 'Delete'),
                React.createElement('option', { key: 'bulk-activate', value: 'activate' }, 'Activate'),
                React.createElement('option', { key: 'bulk-deactivate', value: 'deactivate' }, 'Deactivate')
            ])
        ]),

        // Table
        React.createElement('table', { key: 'table', className: 'wp-list-table widefat fixed striped' }, [
            React.createElement('thead', { key: 'thead' }, 
                React.createElement('tr', {}, [
                    React.createElement('th', { key: 'check', className: 'check-column' },
                        React.createElement('input', {
                            type: 'checkbox',
                            onChange: handleSelectAll,
                            checked: selectedCodes.length === promoCodes.length && promoCodes.length > 0
                        })
                    ),
                    React.createElement('th', { key: 'code' }, 'Code'),
                    React.createElement('th', { key: 'description' }, 'Description'),
                    React.createElement('th', { key: 'discount' }, 'Discount'),
                    React.createElement('th', { key: 'usage' }, 'Usage'),
                    React.createElement('th', { key: 'valid' }, 'Valid Period'),
                    React.createElement('th', { key: 'status' }, 'Status'),
                    React.createElement('th', { key: 'actions' }, 'Actions')
                ])
            ),
            React.createElement('tbody', { key: 'tbody' },
                promoCodes.length === 0 
                    ? React.createElement('tr', { key: 'no-data' },
                        React.createElement('td', { colSpan: 8, style: { textAlign: 'center' } }, 'No promo codes found')
                    )
                    : promoCodes.map(code => 
                        React.createElement('tr', { key: code.id }, [
                            React.createElement('td', { key: 'check' },
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: selectedCodes.includes(code.id),
                                    onChange: () => handleSelectCode(code.id)
                                })
                            ),
                            React.createElement('td', { key: 'code' },
                                React.createElement('strong', {}, code.code)
                            ),
                            React.createElement('td', { key: 'description' }, code.description || '-'),
                            React.createElement('td', { key: 'discount' },
                                code.discount_type === 'percentage' 
                                    ? `${code.discount_value}%`
                                    : formatCurrency(code.discount_value)
                            ),
                            React.createElement('td', { key: 'usage' },
                                `${code.used_count || 0}${code.usage_limit ? ` / ${code.usage_limit}` : ''}`
                            ),
                            React.createElement('td', { key: 'valid' },
                                `${formatDate(code.valid_from)} - ${formatDate(code.valid_until)}`
                            ),
                            React.createElement('td', { key: 'status' },
                                React.createElement('span', {
                                    className: `mwb-status mwb-status-${code.status}`,
                                    style: {
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        backgroundColor: code.status === 'active' ? '#46b450' : '#dc3232',
                                        color: 'white'
                                    }
                                }, code.status.charAt(0).toUpperCase() + code.status.slice(1))
                            ),
                            React.createElement('td', { key: 'actions' }, [
                                React.createElement('button', {
                                    key: 'edit',
                                    className: 'button button-small',
                                    onClick: () => handleEdit(code.id),
                                    style: { marginRight: '5px' }
                                }, 'Edit'),
                                React.createElement('button', {
                                    key: 'delete',
                                    className: 'button button-small button-link-delete',
                                    onClick: () => handleDelete(code.id)
                                }, 'Delete')
                            ])
                        ])
                    )
            )
        ]),

        // Pagination
        totalPages > 1 && React.createElement('div', { key: 'pagination', className: 'mwb-pagination' },
            React.createElement('div', { className: 'tablenav-pages' }, [
                React.createElement('span', { key: 'displaying', className: 'displaying-num' },
                    `${promoCodes.length} items`
                ),
                React.createElement('span', { key: 'pagination-links', className: 'pagination-links' }, [
                    currentPage > 1 && React.createElement('button', {
                        key: 'prev',
                        className: 'button',
                        onClick: () => loadPromoCodes(currentPage - 1, searchTerm, statusFilter)
                    }, '‹ Previous'),
                    React.createElement('span', { key: 'current', className: 'current-page' },
                        `Page ${currentPage} of ${totalPages}`
                    ),
                    currentPage < totalPages && React.createElement('button', {
                        key: 'next',
                        className: 'button',
                        onClick: () => loadPromoCodes(currentPage + 1, searchTerm, statusFilter)
                    }, 'Next ›')
                ])
            ])
        ),

        // Modal for Add/Edit Promo Code
        showModal && React.createElement(PromoCodeModal, {
            key: 'modal',
            promoCode: editingCode,
            onSave: async (promoData) => {
                try {
                    const response = await adminApi.savePromoCode(promoData);
                    setMessage({ type: 'success', text: response.message });
                    setShowModal(false);
                    setEditingCode(null);
                    loadPromoCodes(currentPage, searchTerm, statusFilter);
                } catch (error) {
                    setMessage({ type: 'error', text: error.message });
                    throw error; // Re-throw so modal can handle it
                }
            },
            onClose: () => {
                setShowModal(false);
                setEditingCode(null);
            }
        })
    ]);
};

// Promo Code Modal Component
const PromoCodeModal = ({ promoCode, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        min_amount: '',
        max_discount: '',
        usage_limit: '',
        valid_from: '',
        valid_until: '',
        status: 'active'
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (promoCode) {
            // Format dates for input fields (YYYY-MM-DD format)
            const formatDateForInput = (dateStr) => {
                if (!dateStr) return '';
                const date = new Date(dateStr);
                return date.toISOString().split('T')[0];
            };
            
            setFormData({
                promo_id: promoCode.id || '',
                code: promoCode.code || '',
                description: promoCode.description || '',
                discount_type: promoCode.discount_type || 'percentage',
                discount_value: promoCode.discount_value || '',
                min_amount: promoCode.min_amount || '',
                max_discount: promoCode.max_discount || '',
                usage_limit: promoCode.usage_limit || '',
                valid_from: formatDateForInput(promoCode.valid_from),
                valid_until: formatDateForInput(promoCode.valid_until),
                status: promoCode.status || 'active'
            });
        } else {
            setFormData({
                code: '',
                description: '',
                discount_type: 'percentage',
                discount_value: '',
                min_amount: '',
                max_discount: '',
                usage_limit: '',
                valid_from: '',
                valid_until: '',
                status: 'active'
            });
        }
    }, [promoCode]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e && e.preventDefault();
        
        if (!formData.code.trim()) {
            alert('Promo code is required');
            return;
        }
        
        if (!formData.discount_value || parseFloat(formData.discount_value) <= 0) {
            alert('Discount value must be greater than 0');
            return;
        }

        setLoading(true);
        try {
            await onSave(formData);
        } catch (error) {
            alert('Error saving promo code: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return React.createElement('div', {
        className: 'mwb-modal-overlay',
        style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        onClick: (e) => e.target === e.currentTarget && onClose()
    }, 
        React.createElement('div', {
            className: 'mwb-modal-content',
            style: {
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                width: '600px',
                maxWidth: '90vw',
                maxHeight: '90vh',
                overflow: 'auto'
            }
        }, [
            React.createElement('h2', { key: 'title' }, 
                promoCode ? 'Edit Promo Code' : 'Add New Promo Code'
            ),
            
            React.createElement('div', { 
                key: 'form-container'
            }, [
                React.createElement('table', { 
                    key: 'form-table',
                    className: 'form-table' 
                }, [
                    React.createElement('tbody', { key: 'tbody' }, [
                        React.createElement('tr', { key: 'code-row' }, [
                            React.createElement('th', { key: 'code-label' }, 
                                React.createElement('label', {}, 'Promo Code *')
                            ),
                            React.createElement('td', { key: 'code-input' },
                                React.createElement('input', {
                                    type: 'text',
                                    value: formData.code,
                                    onChange: (e) => handleInputChange('code', e.target.value),
                                    placeholder: 'Enter promo code',
                                    style: { width: '100%' },
                                    required: true
                                })
                            )
                        ]),
                        
                        React.createElement('tr', { key: 'desc-row' }, [
                            React.createElement('th', { key: 'desc-label' },
                                React.createElement('label', {}, 'Description')
                            ),
                            React.createElement('td', { key: 'desc-input' },
                                React.createElement('textarea', {
                                    value: formData.description,
                                    onChange: (e) => handleInputChange('description', e.target.value),
                                    placeholder: 'Enter description',
                                    style: { width: '100%', height: '60px' }
                                })
                            )
                        ]),
                        
                        React.createElement('tr', { key: 'type-row' }, [
                            React.createElement('th', { key: 'type-label' },
                                React.createElement('label', {}, 'Discount Type')
                            ),
                            React.createElement('td', { key: 'type-input' },
                                React.createElement('select', {
                                    value: formData.discount_type,
                                    onChange: (e) => handleInputChange('discount_type', e.target.value),
                                    style: { width: '100%' }
                                }, [
                                    React.createElement('option', { key: 'percentage', value: 'percentage' }, 'Percentage'),
                                    React.createElement('option', { key: 'fixed', value: 'fixed' }, 'Fixed Amount')
                                ])
                            )
                        ]),
                        
                        React.createElement('tr', { key: 'value-row' }, [
                            React.createElement('th', { key: 'value-label' },
                                React.createElement('label', {}, 'Discount Value *')
                            ),
                            React.createElement('td', { key: 'value-input' },
                                React.createElement('input', {
                                    type: 'number',
                                    step: '0.01',
                                    min: '0',
                                    value: formData.discount_value,
                                    onChange: (e) => handleInputChange('discount_value', e.target.value),
                                    placeholder: formData.discount_type === 'percentage' ? 'Enter percentage (0-100)' : 'Enter amount',
                                    style: { width: '100%' },
                                    required: true
                                })
                            )
                        ]),
                        
                        React.createElement('tr', { key: 'min-row' }, [
                            React.createElement('th', { key: 'min-label' },
                                React.createElement('label', {}, 'Minimum Amount')
                            ),
                            React.createElement('td', { key: 'min-input' },
                                React.createElement('input', {
                                    type: 'number',
                                    step: '0.01',
                                    min: '0',
                                    value: formData.min_amount,
                                    onChange: (e) => handleInputChange('min_amount', e.target.value),
                                    placeholder: 'Minimum order amount',
                                    style: { width: '100%' }
                                })
                            )
                        ]),
                        
                        React.createElement('tr', { key: 'max-row' }, [
                            React.createElement('th', { key: 'max-label' },
                                React.createElement('label', {}, 'Maximum Discount')
                            ),
                            React.createElement('td', { key: 'max-input' },
                                React.createElement('input', {
                                    type: 'number',
                                    step: '0.01',
                                    min: '0',
                                    value: formData.max_discount,
                                    onChange: (e) => handleInputChange('max_discount', e.target.value),
                                    placeholder: 'Maximum discount amount',
                                    style: { width: '100%' }
                                })
                            )
                        ]),
                        
                        React.createElement('tr', { key: 'limit-row' }, [
                            React.createElement('th', { key: 'limit-label' },
                                React.createElement('label', {}, 'Usage Limit')
                            ),
                            React.createElement('td', { key: 'limit-input' },
                                React.createElement('input', {
                                    type: 'number',
                                    min: '0',
                                    value: formData.usage_limit,
                                    onChange: (e) => handleInputChange('usage_limit', e.target.value),
                                    placeholder: 'Number of times this code can be used',
                                    style: { width: '100%' }
                                })
                            )
                        ]),
                        
                        React.createElement('tr', { key: 'from-row' }, [
                            React.createElement('th', { key: 'from-label' },
                                React.createElement('label', {}, 'Valid From')
                            ),
                            React.createElement('td', { key: 'from-input' },
                                React.createElement('input', {
                                    type: 'date',
                                    value: formData.valid_from,
                                    onChange: (e) => handleInputChange('valid_from', e.target.value),
                                    style: { width: '100%' }
                                })
                            )
                        ]),
                        
                        React.createElement('tr', { key: 'until-row' }, [
                            React.createElement('th', { key: 'until-label' },
                                React.createElement('label', {}, 'Valid Until')
                            ),
                            React.createElement('td', { key: 'until-input' },
                                React.createElement('input', {
                                    type: 'date',
                                    value: formData.valid_until,
                                    onChange: (e) => handleInputChange('valid_until', e.target.value),
                                    style: { width: '100%' }
                                })
                            )
                        ]),
                        
                        React.createElement('tr', { key: 'status-row' }, [
                            React.createElement('th', { key: 'status-label' },
                                React.createElement('label', {}, 'Status')
                            ),
                            React.createElement('td', { key: 'status-input' },
                                React.createElement('select', {
                                    value: formData.status,
                                    onChange: (e) => handleInputChange('status', e.target.value),
                                    style: { width: '100%' }
                                }, [
                                    React.createElement('option', { key: 'active', value: 'active' }, 'Active'),
                                    React.createElement('option', { key: 'inactive', value: 'inactive' }, 'Inactive')
                                ])
                            )
                        ])
                    ])
                ])
            ]),
            
            React.createElement('div', { 
                key: 'buttons',
                style: { 
                    marginTop: '20px', 
                    textAlign: 'right',
                    borderTop: '1px solid #ddd',
                    paddingTop: '15px'
                } 
            }, [
                React.createElement('button', {
                    key: 'cancel',
                    type: 'button',
                    className: 'button',
                    onClick: onClose,
                    style: { marginRight: '10px' },
                    disabled: loading
                }, 'Cancel'),
                
                React.createElement('button', {
                    key: 'save',
                    type: 'button',
                    className: 'button button-primary',
                    onClick: handleSubmit,
                    disabled: loading
                }, loading ? 'Saving...' : (promoCode ? 'Update' : 'Create'))
            ])
        ])
    );
};

// Settings Management Component
const SettingsManagement = () => {
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getSettings();
            setSettings(response.settings || {});
        } catch (error) {
            console.error('Error loading settings:', error);
            setMessage({ type: 'error', text: 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        try {
            setSaving(true);
            const response = await adminApi.saveSettings(settings);
            setMessage({ type: 'success', text: response.message || 'Settings saved successfully' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    };

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return renderGeneralSettings();
            case 'payment':
                return renderPaymentSettings();
            case 'notifications':
                return renderNotificationSettings();
            case 'advanced':
                return renderAdvancedSettings();
            default:
                return renderGeneralSettings();
        }
    };

    const renderGeneralSettings = () => {
        return React.createElement('div', { className: 'tab-content' }, [
            React.createElement('h3', { key: 'title' }, 'General Settings'),
            React.createElement('table', { key: 'table', className: 'form-table' }, [
                React.createElement('tbody', { key: 'tbody' }, [
                    React.createElement('tr', { key: 'capacity' }, [
                        React.createElement('th', { key: 'label' }, 'Default Daily Capacity'),
                        React.createElement('td', { key: 'input' }, [
                            React.createElement('input', {
                                type: 'number',
                                value: settings.default_capacity || 1000,
                                onChange: (e) => updateSetting('default_capacity', e.target.value),
                                min: '1',
                                style: { width: '100px' }
                            }),
                            React.createElement('p', { className: 'description' }, 'Default daily capacity for new locations')
                        ])
                    ]),
                    React.createElement('tr', { key: 'booking-window' }, [
                        React.createElement('th', { key: 'label' }, 'Booking Window (Days)'),
                        React.createElement('td', { key: 'input' }, [
                            React.createElement('input', {
                                type: 'number',
                                value: settings.booking_window_days || 365,
                                onChange: (e) => updateSetting('booking_window_days', e.target.value),
                                min: '1',
                                style: { width: '100px' }
                            }),
                            React.createElement('p', { className: 'description' }, 'How many days in advance can customers book')
                        ])
                    ]),
                    React.createElement('tr', { key: 'booking-timeout' }, [
                        React.createElement('th', { key: 'label' }, 'Booking Timeout (Minutes)'),
                        React.createElement('td', { key: 'input' }, [
                            React.createElement('input', {
                                type: 'number',
                                value: settings.booking_timeout_minutes || 30,
                                onChange: (e) => updateSetting('booking_timeout_minutes', e.target.value),
                                min: '5',
                                style: { width: '100px' }
                            }),
                            React.createElement('p', { className: 'description' }, 'How long to hold unpaid bookings before expiring')
                        ])
                    ]),
                    React.createElement('tr', { key: 'min-tickets' }, [
                        React.createElement('th', { key: 'label' }, 'Minimum Tickets per Booking'),
                        React.createElement('td', { key: 'input' }, [
                            React.createElement('input', {
                                type: 'number',
                                value: settings.min_tickets_per_booking || 1,
                                onChange: (e) => updateSetting('min_tickets_per_booking', e.target.value),
                                min: '1',
                                style: { width: '100px' }
                            }),
                            React.createElement('p', { className: 'description' }, 'Minimum number of tickets required per booking')
                        ])
                    ]),
                    React.createElement('tr', { key: 'max-tickets' }, [
                        React.createElement('th', { key: 'label' }, 'Maximum Tickets per Booking'),
                        React.createElement('td', { key: 'input' }, [
                            React.createElement('input', {
                                type: 'number',
                                value: settings.max_tickets_per_booking || 50,
                                onChange: (e) => updateSetting('max_tickets_per_booking', e.target.value),
                                min: '1',
                                style: { width: '100px' }
                            }),
                            React.createElement('p', { className: 'description' }, 'Maximum number of tickets allowed per booking')
                        ])
                    ])
                ])
            ])
        ]);
    };

    const renderPaymentSettings = () => {
        return React.createElement('div', { className: 'tab-content' }, [
            React.createElement('h3', { key: 'title' }, 'Payment Settings'),
            React.createElement('table', { key: 'table', className: 'form-table' }, [
                React.createElement('tbody', { key: 'tbody' }, [
                    React.createElement('tr', { key: 'test-mode' }, [
                        React.createElement('th', { key: 'label' }, 'Test Mode'),
                        React.createElement('td', { key: 'input' }, [
                            React.createElement('label', {}, [
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: settings.icici_test_mode === 'yes',
                                    onChange: (e) => updateSetting('icici_test_mode', e.target.checked ? 'yes' : 'no')
                                }),
                                ' Enable test mode (no real payments processed)'
                            ]),
                            React.createElement('p', { className: 'description' }, 'When enabled, payment processing is simulated')
                        ])
                    ]),
                    React.createElement('tr', { key: 'merchant-id' }, [
                        React.createElement('th', { key: 'label' }, 'ICICI Merchant ID'),
                        React.createElement('td', { key: 'input' }, [
                            React.createElement('input', {
                                type: 'text',
                                value: settings.icici_merchant_id || '',
                                onChange: (e) => updateSetting('icici_merchant_id', e.target.value),
                                style: { width: '300px' }
                            }),
                            React.createElement('p', { className: 'description' }, 'Your ICICI payment gateway merchant ID')
                        ])
                    ]),
                    React.createElement('tr', { key: 'working-key' }, [
                        React.createElement('th', { key: 'label' }, 'ICICI Working Key'),
                        React.createElement('td', { key: 'input' }, [
                            React.createElement('input', {
                                type: 'password',
                                value: settings.icici_working_key || '',
                                onChange: (e) => updateSetting('icici_working_key', e.target.value),
                                style: { width: '300px' }
                            }),
                            React.createElement('p', { className: 'description' }, 'Your ICICI payment gateway working key')
                        ])
                    ]),
                    React.createElement('tr', { key: 'access-code' }, [
                        React.createElement('th', { key: 'label' }, 'ICICI Access Code'),
                        React.createElement('td', { key: 'input' }, [
                            React.createElement('input', {
                                type: 'text',
                                value: settings.icici_access_code || '',
                                onChange: (e) => updateSetting('icici_access_code', e.target.value),
                                style: { width: '300px' }
                            }),
                            React.createElement('p', { className: 'description' }, 'Your ICICI payment gateway access code')
                        ])
                    ])
                ])
            ])
        ]);
    };

    const renderNotificationSettings = () => {
        return React.createElement('div', { className: 'tab-content' }, [
            React.createElement('h3', { key: 'title' }, 'Notification Settings'),
            React.createElement('table', { key: 'table', className: 'form-table' }, [
                React.createElement('tbody', { key: 'tbody' }, [
                    React.createElement('tr', { key: 'admin-email' }, [
                        React.createElement('th', { key: 'label' }, 'Admin Email'),
                        React.createElement('td', { key: 'input' }, [
                            React.createElement('input', {
                                type: 'email',
                                value: settings.admin_email || '',
                                onChange: (e) => updateSetting('admin_email', e.target.value),
                                style: { width: '300px' }
                            }),
                            React.createElement('p', { className: 'description' }, 'Email address to receive booking notifications')
                        ])
                    ]),
                    React.createElement('tr', { key: 'email-notifications' }, [
                        React.createElement('th', { key: 'label' }, 'Email Notifications'),
                        React.createElement('td', { key: 'input' }, [
                            React.createElement('label', { style: { display: 'block', marginBottom: '10px' } }, [
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: settings.send_booking_confirmation === 'yes',
                                    onChange: (e) => updateSetting('send_booking_confirmation', e.target.checked ? 'yes' : 'no')
                                }),
                                ' Send booking confirmation emails to customers'
                            ]),
                            React.createElement('label', { style: { display: 'block', marginBottom: '10px' } }, [
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: settings.send_admin_notification === 'yes',
                                    onChange: (e) => updateSetting('send_admin_notification', e.target.checked ? 'yes' : 'no')
                                }),
                                ' Send new booking notifications to admin'
                            ]),
                            React.createElement('label', { style: { display: 'block' } }, [
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: settings.send_reminder_emails === 'yes',
                                    onChange: (e) => updateSetting('send_reminder_emails', e.target.checked ? 'yes' : 'no')
                                }),
                                ' Send reminder emails before visit date'
                            ])
                        ])
                    ]),
                    React.createElement('tr', { key: 'from-name' }, [
                        React.createElement('th', { key: 'label' }, 'Email From Name'),
                        React.createElement('td', { key: 'input' }, [
                            React.createElement('input', {
                                type: 'text',
                                value: settings.email_from_name || 'Marine World',
                                onChange: (e) => updateSetting('email_from_name', e.target.value),
                                style: { width: '300px' }
                            }),
                            React.createElement('p', { className: 'description' }, 'Name that appears in the "From" field of emails')
                        ])
                    ])
                ])
            ])
        ]);
    };

    const renderAdvancedSettings = () => {
        return React.createElement('div', { className: 'tab-content' }, [
            React.createElement('h3', { key: 'title' }, 'Advanced Settings'),
            React.createElement('table', { key: 'table', className: 'form-table' }, [
                React.createElement('tbody', { key: 'tbody' }, [
                    React.createElement('tr', { key: 'debug-mode' }, [
                        React.createElement('th', { key: 'label' }, 'Debug Mode'),
                        React.createElement('td', { key: 'input' }, [
                            React.createElement('label', {}, [
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: settings.debug_mode === 'yes',
                                    onChange: (e) => updateSetting('debug_mode', e.target.checked ? 'yes' : 'no')
                                }),
                                ' Enable debug logging'
                            ]),
                            React.createElement('p', { className: 'description' }, 'Logs detailed information for troubleshooting')
                        ])
                    ]),
                    React.createElement('tr', { key: 'cache-duration' }, [
                        React.createElement('th', { key: 'label' }, 'Cache Duration (Hours)'),
                        React.createElement('td', { key: 'input' }, [
                            React.createElement('input', {
                                type: 'number',
                                value: settings.cache_duration_hours || 24,
                                onChange: (e) => updateSetting('cache_duration_hours', e.target.value),
                                min: '1',
                                style: { width: '100px' }
                            }),
                            React.createElement('p', { className: 'description' }, 'How long to cache pricing and availability data')
                        ])
                    ]),
                    React.createElement('tr', { key: 'cleanup-expired' }, [
                        React.createElement('th', { key: 'label' }, 'Auto-cleanup Expired Bookings'),
                        React.createElement('td', { key: 'input' }, [
                            React.createElement('label', {}, [
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: settings.auto_cleanup_expired === 'yes',
                                    onChange: (e) => updateSetting('auto_cleanup_expired', e.target.checked ? 'yes' : 'no')
                                }),
                                ' Automatically clean up expired bookings'
                            ]),
                            React.createElement('p', { className: 'description' }, 'Automatically remove expired unpaid bookings')
                        ])
                    ]),
                    React.createElement('tr', { key: 'qr-code' }, [
                        React.createElement('th', { key: 'label' }, 'QR Code Generation'),
                        React.createElement('td', { key: 'input' }, [
                            React.createElement('label', {}, [
                                React.createElement('input', {
                                    type: 'checkbox',
                                    checked: settings.generate_qr_codes === 'yes',
                                    onChange: (e) => updateSetting('generate_qr_codes', e.target.checked ? 'yes' : 'no')
                                }),
                                ' Generate QR codes for bookings'
                            ]),
                            React.createElement('p', { className: 'description' }, 'Generate QR codes for ticket verification')
                        ])
                    ]),
                    React.createElement('tr', { key: 'clear-bookings' }, [
                        React.createElement('th', { key: 'label' }, 'Clear All Bookings'),
                        React.createElement('td', { key: 'input' }, [
                            React.createElement('div', {
                                key: 'clear-section',
                                style: { 
                                    padding: '15px', 
                                    border: '2px solid #dc3545', 
                                    borderRadius: '5px', 
                                    backgroundColor: '#f8d7da' 
                                }
                            }, [
                                React.createElement('h4', { 
                                    key: 'warning-title',
                                    style: { color: '#721c24', margin: '0 0 10px 0' }
                                }, '⚠️ Danger Zone'),
                                React.createElement('p', { 
                                    key: 'warning',
                                    style: { color: '#721c24', margin: '0 0 15px 0' }
                                }, 'This will permanently delete ALL booking data. This action cannot be undone!'),
                                React.createElement('input', {
                                    key: 'confirm-input',
                                    type: 'text',
                                    placeholder: 'Type DELETE_ALL_BOOKINGS to confirm',
                                    value: settings.clearBookingsConfirm || '',
                                    onChange: (e) => updateSetting('clearBookingsConfirm', e.target.value),
                                    style: { 
                                        width: '300px', 
                                        marginRight: '10px',
                                        border: '1px solid #dc3545',
                                        padding: '5px'
                                    }
                                }),
                                React.createElement('button', {
                                    key: 'clear-btn',
                                    type: 'button',
                                    className: 'button',
                                    style: { 
                                        backgroundColor: '#dc3545', 
                                        color: 'white',
                                        border: 'none'
                                    },
                                    disabled: settings.clearBookingsConfirm !== 'DELETE_ALL_BOOKINGS',
                                    onClick: async () => {
                                        if (settings.clearBookingsConfirm === 'DELETE_ALL_BOOKINGS') {
                                            if (confirm('Are you absolutely sure? This will delete ALL bookings permanently!')) {
                                                try {
                                                    await adminApi.clearAllBookings('DELETE_ALL_BOOKINGS');
                                                    setMessage({ type: 'success', text: 'All bookings have been cleared successfully!' });
                                                    updateSetting('clearBookingsConfirm', '');
                                                } catch (error) {
                                                    setMessage({ type: 'error', text: 'Failed to clear bookings: ' + error.message });
                                                }
                                            }
                                        }
                                    }
                                }, 'Clear All Bookings')
                            ]),
                            React.createElement('p', { 
                                key: 'description',
                                className: 'description',
                                style: { marginTop: '10px' }
                            }, 'Use this option for testing purposes to reset all booking data')
                        ])
                    ])
                ])
            ])
        ]);
    };

    if (loading) {
        return React.createElement('div', { className: 'mwb-loading' }, 'Loading settings...');
    }

    return React.createElement('div', { className: 'mwb-settings-management' }, [
        // Tab Navigation
        React.createElement('nav', { key: 'nav', className: 'nav-tab-wrapper' }, [
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
            className: `notice notice-${message.type} is-dismissible`,
            style: { margin: '20px 0' }
        }, [
            React.createElement('p', { key: 'msg-text' }, message.text),
            React.createElement('button', {
                key: 'dismiss',
                className: 'notice-dismiss',
                onClick: () => setMessage({ type: '', text: '' })
            }, 'Dismiss')
        ]),

        // Tab Content
        React.createElement('div', { key: 'content', className: 'mwb-tab-content' },
            renderTabContent()
        ),

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

// Analytics & Reports Component
const AnalyticsManagement = () => {
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
                adminApi.getDashboardStats(dateRange.from, dateRange.to),
                adminApi.getBookingsList(1, 100, '', { 
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

    if (loading) {
        return React.createElement('div', {
            style: { display: 'flex', justifyContent: 'center', padding: '50px' }
        }, [
            React.createElement('div', { key: 'spinner', className: 'spinner' }),
            React.createElement('span', { key: 'text', style: { marginLeft: '10px' } }, 'Loading analytics...')
        ]);
    }

    // Calculate additional analytics
    const calculateAnalytics = () => {
        if (!bookings.length) return {};
        
        // Group by date for trends
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

        // Payment method breakdown
        const paymentMethods = {};
        bookings.forEach(booking => {
            const method = booking.payment_method || 'Unknown';
            paymentMethods[method] = (paymentMethods[method] || 0) + 1;
        });

        // Popular visit dates
        const visitDates = {};
        bookings.forEach(booking => {
            const date = booking.visit_date;
            visitDates[date] = (visitDates[date] || 0) + 1;
        });

        return { dailyStats, paymentMethods, visitDates };
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

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return React.createElement('div', { key: 'overview' }, [
                    React.createElement('div', {
                        key: 'stats-grid',
                        style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '20px',
                            marginBottom: '30px'
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
                    ])
                ]);

            case 'trends':
                return React.createElement('div', { key: 'trends' }, [
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
                ]);

            case 'reports':
                return React.createElement('div', { key: 'reports' }, [
                    React.createElement('h3', { key: 'title' }, 'Detailed Reports'),
                    React.createElement('div', {
                        key: 'reports-grid',
                        style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }
                    }, [
                        React.createElement('div', {
                            key: 'payment-methods',
                            style: { background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }
                        }, [
                            React.createElement('h4', { key: 'title' }, 'Payment Methods'),
                            React.createElement('div', { key: 'methods' },
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
                        ]),
                        React.createElement('div', {
                            key: 'popular-dates',
                            style: { background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }
                        }, [
                            React.createElement('h4', { key: 'title' }, 'Popular Visit Dates'),
                            React.createElement('div', { key: 'dates' },
                                Object.entries(analyticsData.visitDates || {})
                                    .sort(([,a], [,b]) => b - a)
                                    .slice(0, 10)
                                    .map(([date, count]) =>
                                        React.createElement('div', {
                                            key: date,
                                            style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }
                                        }, [
                                            React.createElement('span', { key: 'date' }, date),
                                            React.createElement('span', { key: 'count' }, count)
                                        ])
                                    )
                            )
                        ])
                    ])
                ]);

            default:
                return null;
        }
    };

    return React.createElement('div', { className: 'mwb-analytics-container' }, [
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

        renderTabContent()
    ]);
};

// Birthday Offers Management Component
const BirthdayOffersManagement = () => {
    const [birthdayOffers, setBirthdayOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingOffer, setEditingOffer] = useState(null);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');

    const loadBirthdayOffers = useCallback(async () => {
        try {
            setLoading(true);
            const data = await adminApi.getBirthdayOffersList(searchTerm, statusFilter);
            setBirthdayOffers(data);
        } catch (error) {
            console.error('Failed to load birthday offers:', error);
            showMessage('Failed to load birthday offers', 'error');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        loadBirthdayOffers();
    }, [loadBirthdayOffers]);

    const showMessage = (text, type = 'success') => {
        setMessage(text);
        setMessageType(type);
        setTimeout(() => setMessage(''), 5000);
    };

    const handleCreateOffer = () => {
        setEditingOffer(null);
        setShowModal(true);
    };

    const handleEditOffer = async (offerId) => {
        try {
            const offer = await adminApi.getBirthdayOffer(offerId);
            setEditingOffer(offer);
            setShowModal(true);
        } catch (error) {
            showMessage('Failed to load offer details', 'error');
        }
    };

    const handleDeleteOffer = async (offerId) => {
        if (!confirm('Are you sure you want to delete this birthday offer?')) return;

        try {
            await adminApi.deleteBirthdayOffer(offerId);
            showMessage('Birthday offer deleted successfully');
            loadBirthdayOffers();
        } catch (error) {
            showMessage('Failed to delete birthday offer', 'error');
        }
    };

    const handleSaveOffer = async (offerData) => {
        try {
            console.log('Saving birthday offer data:', offerData);
            
            // Add debugging info
            if (!offerData.title || !offerData.discount_type || !offerData.discount_value) {
                throw new Error('Missing required fields: title, discount_type, or discount_value');
            }

            const result = await adminApi.saveBirthdayOffer(offerData);
            console.log('Save result:', result);
            
            showMessage(editingOffer ? 'Birthday offer updated successfully' : 'Birthday offer created successfully');
            setShowModal(false);
            setEditingOffer(null);
            loadBirthdayOffers();
        } catch (error) {
            console.error('Error saving birthday offer:', error);
            showMessage(`Failed to save birthday offer: ${error.message}`, 'error');
        }
    };

    const BirthdayOfferModal = ({ show, offer, onSave, onClose }) => {
        const [formData, setFormData] = useState({
            id: '',
            title: '',
            description: '',
            discount_type: 'percentage',
            discount_value: '',
            applicable_tickets: ['general', 'child', 'senior'], // Default to all tickets
            offer_duration_type: 'long_term', // New field for offer type
            valid_from: '',
            valid_until: '',
            min_age_requirement: 1,
            max_age_requirement: '',
            days_before_birthday: 7,
            days_after_birthday: 7,
            usage_limit_total: '',
            usage_limit_per_booking: 1,
            terms_conditions: '',
            status: 'active'
        });

        useEffect(() => {
            if (offer) {
                setFormData({
                    id: offer.id || '',
                    title: offer.title || '',
                    description: offer.description || '',
                    discount_type: offer.discount_type || 'percentage',
                    discount_value: offer.discount_value || '',
                    applicable_tickets: offer.applicable_tickets || ['general', 'child', 'senior'],
                    offer_duration_type: offer.offer_duration_type || 'long_term',
                    valid_from: offer.valid_from || '',
                    valid_until: offer.valid_until || '',
                    min_age_requirement: offer.min_age_requirement || 1,
                    max_age_requirement: offer.max_age_requirement || '',
                    days_before_birthday: offer.days_before_birthday || 7,
                    days_after_birthday: offer.days_after_birthday || 7,
                    usage_limit_total: offer.usage_limit_total || '',
                    usage_limit_per_booking: offer.usage_limit_per_booking || 1,
                    terms_conditions: offer.terms_conditions || '',
                    status: offer.status || 'active'
                });
            } else {
                setFormData({
                    id: '',
                    title: '',
                    description: '',
                    discount_type: 'percentage',
                    discount_value: '',
                    applicable_tickets: ['general', 'child', 'senior'],
                    offer_duration_type: 'long_term',
                    valid_from: '',
                    valid_until: '',
                    min_age_requirement: 1,
                    max_age_requirement: '',
                    days_before_birthday: 7,
                    days_after_birthday: 7,
                    usage_limit_total: '',
                    usage_limit_per_booking: 1,
                    terms_conditions: '',
                    status: 'active'
                });
            }
        }, [offer, show]);

        const handleSubmit = (e) => {
            e.preventDefault();
            console.log('Form submitted with data:', formData);
            
            // Validate required fields
            if (!formData.title.trim()) {
                alert('Please enter a title for the birthday offer');
                return;
            }
            
            if (!formData.discount_value || formData.discount_value <= 0) {
                alert('Please enter a valid discount value');
                return;
            }
            
            onSave(formData);
        };

        const updateField = (field, value) => {
            setFormData(prev => ({ ...prev, [field]: value }));
        };

        if (!show) return null;

        return React.createElement('div', { 
            className: 'mwb-modal-overlay',
            style: { 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                backgroundColor: 'rgba(0,0,0,0.7)', 
                zIndex: 100000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }
        },
            React.createElement('div', { 
                className: 'mwb-modal',
                style: {
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    width: '90%',
                    maxWidth: '800px',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }
            },
                React.createElement('div', { 
                    className: 'mwb-modal-header',
                    style: {
                        padding: '20px',
                        borderBottom: '1px solid #ddd',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }
                },
                    React.createElement('h3', { style: { margin: 0 } }, offer ? 'Edit Birthday Offer' : 'Create Birthday Offer'),
                    React.createElement('button', {
                        type: 'button',
                        className: 'mwb-modal-close',
                        onClick: onClose,
                        style: {
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: '5px'
                        }
                    }, '×')
                ),
                React.createElement('form', { onSubmit: handleSubmit },
                    React.createElement('div', { 
                        className: 'mwb-modal-body',
                        style: { padding: '20px' }
                    },
                        // Basic Information Section
                        React.createElement('h4', { style: { marginTop: 0, marginBottom: '15px', color: '#333' } }, '🎂 Basic Information'),
                        
                        React.createElement('table', { 
                            className: 'form-table',
                            style: { width: '100%', marginBottom: '20px' }
                        }, [
                            React.createElement('tbody', null, [
                                React.createElement('tr', { key: 'title' }, [
                                    React.createElement('th', { scope: 'row', style: { width: '150px' } }, 
                                        React.createElement('label', null, 'Title *')
                                    ),
                                    React.createElement('td', null,
                                        React.createElement('input', {
                                            type: 'text',
                                            className: 'regular-text',
                                            value: formData.title,
                                            onChange: (e) => updateField('title', e.target.value),
                                            required: true,
                                            placeholder: 'e.g., Birthday Special Discount'
                                        })
                                    )
                                ]),
                                React.createElement('tr', { key: 'description' }, [
                                    React.createElement('th', { scope: 'row' }, 
                                        React.createElement('label', null, 'Description')
                                    ),
                                    React.createElement('td', null,
                                        React.createElement('textarea', {
                                            className: 'large-text',
                                            rows: 3,
                                            value: formData.description,
                                            onChange: (e) => updateField('description', e.target.value),
                                            placeholder: 'Brief description of the birthday offer'
                                        })
                                    )
                                ]),
                                React.createElement('tr', { key: 'status' }, [
                                    React.createElement('th', { scope: 'row' }, 
                                        React.createElement('label', null, 'Status')
                                    ),
                                    React.createElement('td', null,
                                        React.createElement('select', {
                                            value: formData.status,
                                            onChange: (e) => updateField('status', e.target.value)
                                        }, [
                                            React.createElement('option', { key: 'active', value: 'active' }, 'Active'),
                                            React.createElement('option', { key: 'inactive', value: 'inactive' }, 'Inactive')
                                        ])
                                    )
                                ])
                            ])
                        ]),

                        // Discount Details Section
                        React.createElement('h4', { style: { marginBottom: '15px', color: '#333' } }, '💰 Discount Details'),
                        
                        React.createElement('table', { 
                            className: 'form-table',
                            style: { width: '100%', marginBottom: '20px' }
                        }, [
                            React.createElement('tbody', null, [
                                React.createElement('tr', { key: 'discount-type' }, [
                                    React.createElement('th', { scope: 'row' }, 
                                        React.createElement('label', null, 'Discount Type *')
                                    ),
                                    React.createElement('td', null,
                                        React.createElement('select', {
                                            value: formData.discount_type,
                                            onChange: (e) => updateField('discount_type', e.target.value)
                                        }, [
                                            React.createElement('option', { key: 'percentage', value: 'percentage' }, 'Percentage Discount'),
                                            React.createElement('option', { key: 'fixed', value: 'fixed' }, 'Fixed Amount Discount')
                                        ])
                                    )
                                ]),
                                React.createElement('tr', { key: 'discount-value' }, [
                                    React.createElement('th', { scope: 'row' }, 
                                        React.createElement('label', null, `Discount Value * ${formData.discount_type === 'percentage' ? '(%)' : '(₹)'}`)
                                    ),
                                    React.createElement('td', null,
                                        React.createElement('input', {
                                            type: 'number',
                                            className: 'small-text',
                                            step: formData.discount_type === 'percentage' ? '0.01' : '1',
                                            min: '0',
                                            max: formData.discount_type === 'percentage' ? '100' : undefined,
                                            value: formData.discount_value,
                                            onChange: (e) => updateField('discount_value', e.target.value),
                                            required: true,
                                            placeholder: formData.discount_type === 'percentage' ? 'e.g., 10' : 'e.g., 100'
                                        })
                                    )
                                ])
                            ])
                        ]),

                        // Offer Duration Section
                        React.createElement('h4', { style: { marginBottom: '15px', color: '#333' } }, '📅 Offer Duration'),
                        
                        React.createElement('table', { 
                            className: 'form-table',
                            style: { width: '100%', marginBottom: '20px' }
                        }, [
                            React.createElement('tbody', null, [
                                React.createElement('tr', { key: 'duration-type' }, [
                                    React.createElement('th', { scope: 'row' }, 
                                        React.createElement('label', null, 'Offer Duration Type')
                                    ),
                                    React.createElement('td', null, [
                                        React.createElement('label', { key: 'long-term', style: { marginRight: '20px' } }, [
                                            React.createElement('input', {
                                                type: 'radio',
                                                name: 'duration_type',
                                                value: 'long_term',
                                                checked: formData.offer_duration_type === 'long_term',
                                                onChange: (e) => updateField('offer_duration_type', e.target.value),
                                                style: { marginRight: '5px' }
                                            }),
                                            'Long-term Offer (Always Available)'
                                        ]),
                                        React.createElement('label', { key: 'specific-period' }, [
                                            React.createElement('input', {
                                                type: 'radio',
                                                name: 'duration_type',
                                                value: 'specific_period',
                                                checked: formData.offer_duration_type === 'specific_period',
                                                onChange: (e) => updateField('offer_duration_type', e.target.value),
                                                style: { marginRight: '5px' }
                                            }),
                                            'Specific Period Only'
                                        ])
                                    ])
                                ]),
                                formData.offer_duration_type === 'specific_period' && React.createElement('tr', { key: 'validity-dates' }, [
                                    React.createElement('th', { scope: 'row' }, 
                                        React.createElement('label', null, 'Validity Period')
                                    ),
                                    React.createElement('td', null, [
                                        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [
                                            React.createElement('div', { key: 'from' }, [
                                                React.createElement('label', { style: { display: 'block', marginBottom: '5px' } }, 'From:'),
                                                React.createElement('input', {
                                                    type: 'date',
                                                    value: formData.valid_from,
                                                    onChange: (e) => updateField('valid_from', e.target.value)
                                                })
                                            ]),
                                            React.createElement('div', { key: 'to' }, [
                                                React.createElement('label', { style: { display: 'block', marginBottom: '5px' } }, 'To:'),
                                                React.createElement('input', {
                                                    type: 'date',
                                                    value: formData.valid_until,
                                                    onChange: (e) => updateField('valid_until', e.target.value)
                                                })
                                            ])
                                        ])
                                    ])
                                ])
                            ])
                        ]),

                        // Birthday Window Section
                        React.createElement('h4', { style: { marginBottom: '15px', color: '#333' } }, '🎈 Birthday Eligibility Window'),
                        
                        React.createElement('table', { 
                            className: 'form-table',
                            style: { width: '100%', marginBottom: '20px' }
                        }, [
                            React.createElement('tbody', null, [
                                React.createElement('tr', { key: 'birthday-window' }, [
                                    React.createElement('th', { scope: 'row' }, 
                                        React.createElement('label', null, 'Birthday Window')
                                    ),
                                    React.createElement('td', null, [
                                        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [
                                            React.createElement('div', { key: 'before' }, [
                                                React.createElement('label', { style: { display: 'block', marginBottom: '5px' } }, 'Days Before:'),
                                                React.createElement('input', {
                                                    type: 'number',
                                                    min: '0',
                                                    value: formData.days_before_birthday,
                                                    onChange: (e) => updateField('days_before_birthday', e.target.value),
                                                    style: { width: '60px' }
                                                })
                                            ]),
                                            React.createElement('div', { key: 'after' }, [
                                                React.createElement('label', { style: { display: 'block', marginBottom: '5px' } }, 'Days After:'),
                                                React.createElement('input', {
                                                    type: 'number',
                                                    min: '0',
                                                    value: formData.days_after_birthday,
                                                    onChange: (e) => updateField('days_after_birthday', e.target.value),
                                                    style: { width: '60px' }
                                                })
                                            ])
                                        ]),
                                        React.createElement('p', { 
                                            className: 'description',
                                            style: { margin: '5px 0 0 0', fontSize: '13px', color: '#666' }
                                        }, 'Define how many days before and after their birthday customers can use this offer.')
                                    ])
                                ]),
                                React.createElement('tr', { key: 'age-requirements' }, [
                                    React.createElement('th', { scope: 'row' }, 
                                        React.createElement('label', null, 'Age Requirements')
                                    ),
                                    React.createElement('td', null, [
                                        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [
                                            React.createElement('div', { key: 'min-age' }, [
                                                React.createElement('label', { style: { display: 'block', marginBottom: '5px' } }, 'Min Age:'),
                                                React.createElement('input', {
                                                    type: 'number',
                                                    min: '1',
                                                    value: formData.min_age_requirement,
                                                    onChange: (e) => updateField('min_age_requirement', e.target.value),
                                                    required: true,
                                                    style: { width: '60px' }
                                                })
                                            ]),
                                            React.createElement('div', { key: 'max-age' }, [
                                                React.createElement('label', { style: { display: 'block', marginBottom: '5px' } }, 'Max Age (optional):'),
                                                React.createElement('input', {
                                                    type: 'number',
                                                    min: '1',
                                                    value: formData.max_age_requirement,
                                                    onChange: (e) => updateField('max_age_requirement', e.target.value),
                                                    placeholder: 'No limit',
                                                    style: { width: '80px' }
                                                })
                                            ])
                                        ])
                                    ])
                                ])
                            ])
                        ]),

                        // Usage Limits Section
                        React.createElement('h4', { style: { marginBottom: '15px', color: '#333' } }, '🎫 Usage Limits'),
                        
                        React.createElement('table', { 
                            className: 'form-table',
                            style: { width: '100%', marginBottom: '20px' }
                        }, [
                            React.createElement('tbody', null, [
                                React.createElement('tr', { key: 'usage-limits' }, [
                                    React.createElement('th', { scope: 'row' }, 
                                        React.createElement('label', null, 'Usage Limits')
                                    ),
                                    React.createElement('td', null, [
                                        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '15px' } }, [
                                            React.createElement('div', { key: 'total-limit' }, [
                                                React.createElement('label', { style: { display: 'block', marginBottom: '5px' } }, 'Total Uses (optional):'),
                                                React.createElement('input', {
                                                    type: 'number',
                                                    min: '1',
                                                    value: formData.usage_limit_total,
                                                    onChange: (e) => updateField('usage_limit_total', e.target.value),
                                                    placeholder: 'Unlimited',
                                                    style: { width: '100px' }
                                                })
                                            ]),
                                            React.createElement('div', { key: 'per-booking' }, [
                                                React.createElement('label', { style: { display: 'block', marginBottom: '5px' } }, 'Per Booking:'),
                                                React.createElement('input', {
                                                    type: 'number',
                                                    min: '1',
                                                    value: formData.usage_limit_per_booking,
                                                    onChange: (e) => updateField('usage_limit_per_booking', e.target.value),
                                                    style: { width: '60px' }
                                                })
                                            ])
                                        ])
                                    ])
                                ])
                            ])
                        ]),

                        // Terms and Conditions Section
                        React.createElement('h4', { style: { marginBottom: '15px', color: '#333' } }, '📋 Terms & Conditions'),
                        
                        React.createElement('table', { 
                            className: 'form-table',
                            style: { width: '100%' }
                        }, [
                            React.createElement('tbody', null, [
                                React.createElement('tr', { key: 'terms' }, [
                                    React.createElement('th', { scope: 'row' }, 
                                        React.createElement('label', null, 'Terms & Conditions')
                                    ),
                                    React.createElement('td', null,
                                        React.createElement('textarea', {
                                            className: 'large-text',
                                            rows: 4,
                                            value: formData.terms_conditions,
                                            onChange: (e) => updateField('terms_conditions', e.target.value),
                                            placeholder: 'Enter any terms and conditions for this birthday offer...'
                                        })
                                    )
                                ])
                            ])
                        ])
                    ),
                    React.createElement('div', { 
                        className: 'mwb-modal-footer',
                        style: {
                            padding: '20px',
                            borderTop: '1px solid #ddd',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '10px'
                        }
                    }, [
                        React.createElement('button', {
                            key: 'cancel',
                            type: 'button',
                            className: 'button',
                            onClick: onClose
                        }, 'Cancel'),
                        React.createElement('button', {
                            key: 'submit',
                            type: 'submit',
                            className: 'button button-primary'
                        }, offer ? 'Update Offer' : 'Create Offer')
                    ])
                )
            )
        );
    };

    const filteredOffers = birthdayOffers.filter(offer => {
        const matchesSearch = !searchTerm || 
            offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            offer.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !statusFilter || offer.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return React.createElement('div', { className: 'mwb-admin-section' }, [
        message && React.createElement('div', {
            key: 'message',
            className: `notice notice-${messageType === 'error' ? 'error' : 'success'} is-dismissible`,
            style: { margin: '10px 0' }
        }, React.createElement('p', null, message)),

        React.createElement('div', {
            key: 'header',
            className: 'mwb-section-header'
        }, [
            React.createElement('div', { key: 'controls', className: 'mwb-section-controls' }, [
                React.createElement('input', {
                    key: 'search',
                    type: 'text',
                    placeholder: 'Search birthday offers...',
                    value: searchTerm,
                    onChange: (e) => setSearchTerm(e.target.value),
                    className: 'mwb-search-input'
                }),
                React.createElement('select', {
                    key: 'filter',
                    value: statusFilter,
                    onChange: (e) => setStatusFilter(e.target.value),
                    className: 'mwb-filter-select'
                }, [
                    React.createElement('option', { key: 'all', value: '' }, 'All Status'),
                    React.createElement('option', { key: 'active', value: 'active' }, 'Active'),
                    React.createElement('option', { key: 'inactive', value: 'inactive' }, 'Inactive')
                ]),
                React.createElement('button', {
                    key: 'create',
                    className: 'button button-primary',
                    onClick: handleCreateOffer
                }, 'Create Birthday Offer'),
                React.createElement('button', {
                    key: 'test',
                    className: 'button',
                    onClick: async () => {
                        try {
                            console.log('Testing simple birthday offer creation...');
                            const testData = {
                                title: 'Test Birthday Offer',
                                description: 'Test description',
                                discount_type: 'percentage',
                                discount_value: 10,
                                status: 'active'
                            };
                            const result = await adminApi.saveBirthdayOffer(testData);
                            console.log('Test result:', result);
                            alert('Test successful! Check console for details.');
                            loadBirthdayOffers();
                        } catch (error) {
                            console.error('Test failed:', error);
                            alert('Test failed: ' + error.message);
                        }
                    },
                    style: { marginLeft: '10px' }
                }, 'Test Simple Save')
            ])
        ]),

        loading ? React.createElement(LoadingSpinner, { key: 'loading' }) :
        React.createElement('div', { key: 'table', className: 'mwb-table-container' },
            React.createElement('table', { className: 'wp-list-table widefat fixed striped' }, [
                React.createElement('thead', { key: 'head' },
                    React.createElement('tr', null, [
                        React.createElement('th', { key: 'title' }, 'Title'),
                        React.createElement('th', { key: 'discount' }, 'Discount'),
                        React.createElement('th', { key: 'validity' }, 'Validity'),
                        React.createElement('th', { key: 'usage' }, 'Usage'),
                        React.createElement('th', { key: 'status' }, 'Status'),
                        React.createElement('th', { key: 'actions' }, 'Actions')
                    ])
                ),
                React.createElement('tbody', { key: 'body' },
                    filteredOffers.length === 0 ?
                    React.createElement('tr', { key: 'empty' },
                        React.createElement('td', { colSpan: 6, style: { textAlign: 'center', padding: '40px' } },
                            'No birthday offers found'
                        )
                    ) :
                    filteredOffers.map(offer =>
                        React.createElement('tr', { key: offer.id }, [
                            React.createElement('td', { key: 'title' }, [
                                React.createElement('strong', null, offer.title),
                                offer.description && React.createElement('br'),
                                offer.description && React.createElement('small', { style: { color: '#666' } }, offer.description)
                            ]),
                            React.createElement('td', { key: 'discount' },
                                offer.discount_type === 'percentage' ? 
                                `${offer.discount_value}% off` : 
                                `₹${offer.discount_value} off`
                            ),
                            React.createElement('td', { key: 'validity' }, [
                                offer.valid_from && React.createElement('div', null, `From: ${utils.formatDate(offer.valid_from)}`),
                                offer.valid_until && React.createElement('div', null, `Until: ${utils.formatDate(offer.valid_until)}`)
                            ]),
                            React.createElement('td', { key: 'usage' },
                                `${offer.usage_count || 0}${offer.usage_limit_total ? ` / ${offer.usage_limit_total}` : ''}`
                            ),
                            React.createElement('td', { key: 'status' },
                                React.createElement('span', {
                                    className: `mwb-status mwb-status-${offer.status}`
                                }, offer.status.charAt(0).toUpperCase() + offer.status.slice(1))
                            ),
                            React.createElement('td', { key: 'actions' }, [
                                React.createElement('button', {
                                    key: 'edit',
                                    className: 'button button-small',
                                    onClick: () => handleEditOffer(offer.id),
                                    style: { marginRight: '5px' }
                                }, 'Edit'),
                                React.createElement('button', {
                                    key: 'delete',
                                    className: 'button button-small button-link-delete',
                                    onClick: () => handleDeleteOffer(offer.id)
                                }, 'Delete')
                            ])
                        ])
                    )
                )
            ])
        ),

        React.createElement(BirthdayOfferModal, {
            key: 'modal',
            show: showModal,
            offer: editingOffer,
            onSave: handleSaveOffer,
            onClose: () => {
                setShowModal(false);
                setEditingOffer(null);
            }
        })
    ]);
};

// Initialize components based on page - only if in admin context
if (typeof marineWorldAdmin !== 'undefined' && marineWorldAdmin.currentPage) {
    if (document.getElementById('mwb-birthday-offers-dashboard')) {
        render(React.createElement(BirthdayOffersManagement), document.getElementById('mwb-birthday-offers-dashboard'));
    }

    if (document.getElementById('mwb-settings-dashboard')) {
        render(React.createElement(SettingsManagement), document.getElementById('mwb-settings-dashboard'));
    }

    if (document.getElementById('mwb-analytics-dashboard')) {
        render(React.createElement(AnalyticsManagement), document.getElementById('mwb-analytics-dashboard'));
    }
}

})();
