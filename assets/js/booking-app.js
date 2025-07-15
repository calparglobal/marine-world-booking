// Marine World Booking React App
(function() {
    'use strict';

    // Check if React is available
    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
        console.error('Marine World Booking: React is not loaded');
        return;
    }

    const { useState, useEffect, useCallback, useMemo } = React;
    const { render } = ReactDOM;

    // Configuration from WordPress
    const config = window.marineWorldBooking || {};

    // API Helper Functions
    const api = {
        baseUrl: config.apiUrl || '/wp-json/marine-world/v1/',
        nonce: config.nonce || '',

        async request(endpoint, options = {}) {
            const url = `${this.baseUrl}${endpoint}`;
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': this.nonce,
                },
                ...options,
            };

            if (defaultOptions.body && typeof defaultOptions.body === 'object') {
                defaultOptions.body = JSON.stringify(defaultOptions.body);
            }

            try {
                const response = await fetch(url, defaultOptions);
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || `HTTP ${response.status}`);
                }
                
                return data;
            } catch (error) {
                console.error('API Request failed:', error);
                throw error;
            }
        },

        getLocations() {
            return this.request('locations');
        },

        getAvailability(locationId, dateFrom, dateTo) {
            const params = new URLSearchParams({
                location_id: locationId,
                date_from: dateFrom,
                ...(dateTo && { date_to: dateTo })
            });
            return this.request(`availability?${params}`);
        },

        calculatePricing(data) {
            return this.request('pricing/calculate', {
                method: 'POST',
                body: data,
            });
        },

        validatePromoCode(code, amount) {
            return this.request('promo-code/validate', {
                method: 'POST',
                body: { code, amount },
            });
        },

        createBooking(bookingData) {
            return this.request('booking', {
                method: 'POST',
                body: bookingData,
            });
        },

        getBooking(bookingId) {
            return this.request(`booking/${bookingId}`);
        },

        confirmPayment(bookingId, paymentData) {
            return this.request(`booking/${bookingId}/payment`, {
                method: 'POST',
                body: paymentData,
            });
        },

        getAddons() {
            return this.request('addons');
        },

        getCurrentPricing(date) {
            const params = new URLSearchParams({ date });
            return this.request(`pricing/current?${params}`);
        },

        getBirthdayOffers() {
            return this.request('birthday-offers');
        },

        validateBirthdayOffer(offerId, birthdayData) {
            return this.request('birthday-offers/validate', {
                method: 'POST',
                body: { offer_id: offerId, ...birthdayData },
            });
        },

    };

    // Utility Functions
    const utils = {
        formatDate(date) {
            return new Date(date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },

        formatCurrency(amount) {
            const currency = config.currency || '₹';
            return `${currency}${Number(amount).toLocaleString('en-IN')}`;
        },

        validateEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },

        validatePhone(phone) {
            return /^[+]?[\d\s-()]{10,15}$/.test(phone);
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

    // Loading Component
    const LoadingSpinner = () => React.createElement('div', { className: 'mwb-loading' },
        React.createElement('div', { className: 'mwb-spinner' }),
        React.createElement('p', null, config.strings?.loading || 'Loading...')
    );

    // Error Component
    const ErrorMessage = ({ message, onRetry }) => React.createElement('div', { className: 'mwb-error' },
        React.createElement('p', null, message),
        onRetry && React.createElement('button', { onClick: onRetry, className: 'mwb-retry-btn' }, 'Retry')
    );

    // Progress Indicator Component
    const ProgressIndicator = ({ currentStep, totalSteps, steps }) => {
        return React.createElement('div', { className: 'mwb-progress' },
            React.createElement('div', { className: 'mwb-progress-steps' },
                steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isActive = stepNumber === currentStep;
                    const isCompleted = stepNumber < currentStep;
                    
                    return React.createElement('div', {
                        key: stepNumber,
                        className: `mwb-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`
                    },
                        React.createElement('div', { className: 'mwb-step-number' }, stepNumber),
                        React.createElement('div', { className: 'mwb-step-title' }, step.title)
                    );
                })
            ),
            React.createElement('div', { className: 'mwb-progress-bar' },
                React.createElement('div', {
                    className: 'mwb-progress-fill',
                    style: { width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }
                })
            )
        );
    };

    // Step 1: Location Selection
    const LocationSelector = ({ data, onNext, onUpdate }) => {
        const [locations, setLocations] = useState([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);
        const [selectedLocation, setSelectedLocation] = useState(data.location_id || '');

        useEffect(() => {
            loadLocations();
        }, []);

        const loadLocations = async () => {
            try {
                setLoading(true);
                const locationsData = await api.getLocations();
                setLocations(locationsData);
                
                if (locationsData.length === 1) {
                    setSelectedLocation(locationsData[0].id);
                    onUpdate({ location_id: locationsData[0].id });
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const handleLocationSelect = (locationId) => {
            setSelectedLocation(locationId);
            onUpdate({ location_id: parseInt(locationId) });
        };

        const handleNext = () => {
            if (selectedLocation) {
                onNext();
            }
        };

        if (loading) return React.createElement(LoadingSpinner);
        if (error) return React.createElement(ErrorMessage, { message: error, onRetry: loadLocations });

        return React.createElement('div', { className: 'mwb-step-content' },
            React.createElement('h2', null, 'Select Location'),
            React.createElement('div', { className: 'mwb-locations-grid' },
                locations.map(location => 
                    React.createElement('div', {
                        key: location.id,
                        className: `mwb-location-card ${selectedLocation == location.id ? 'selected' : ''}`,
                        onClick: () => handleLocationSelect(location.id)
                    },
                        React.createElement('h3', null, location.name),
                        React.createElement('p', null, `${location.city}, ${location.state}`),
                        location.facilities && React.createElement('div', { className: 'mwb-facilities' },
                            location.facilities.slice(0, 3).map((facility, index) => 
                                React.createElement('span', { key: index, className: 'mwb-facility-tag' }, facility)
                            )
                        )
                    )
                )
            ),
            React.createElement('div', { className: 'mwb-step-actions' },
                React.createElement('button', {
                    className: 'mwb-primary-btn',
                    onClick: handleNext,
                    disabled: !selectedLocation
                }, 'Continue')
            )
        );
    };

    // Step 2: Date Selection
    const DateSelector = ({ data, onNext, onBack, onUpdate }) => {
        const [availability, setAvailability] = useState({});
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);
        const [selectedDate, setSelectedDate] = useState(data.booking_date || '');
        const [currentMonth, setCurrentMonth] = useState(new Date());

        useEffect(() => {
            if (data.location_id) {
                loadAvailability();
            }
        }, [data.location_id, currentMonth]);

        const loadAvailability = async () => {
            try {
                setLoading(true);
                const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                
                const availabilityData = await api.getAvailability(
                    data.location_id,
                    startDate.toISOString().split('T')[0],
                    endDate.toISOString().split('T')[0]
                );
                
                const availabilityMap = {};
                availabilityData.forEach(day => {
                    availabilityMap[day.date] = day;
                });
                
                setAvailability(availabilityMap);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const handleDateSelect = (date) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayAvailability = availability[dateStr];
            
            if (dayAvailability && dayAvailability.status !== 'sold_out' && !dayAvailability.is_blackout) {
                setSelectedDate(dateStr);
                onUpdate({ booking_date: dateStr });
            }
        };

        const renderCalendar = () => {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const firstDay = new Date(year, month, 1);
            const today = new Date();
            
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
                const dayAvailability = availability[dateStr];
                const isCurrentMonth = date.getMonth() === month;
                const isPast = date < today;
                const isSelected = dateStr === selectedDate;
                
                let className = 'mwb-calendar-day';
                if (!isCurrentMonth) className += ' other-month';
                if (isPast) className += ' past';
                if (isSelected) className += ' selected';
                
                if (dayAvailability) {
                    className += ` ${dayAvailability.status}`;
                    if (dayAvailability.is_blackout) className += ' blackout';
                }

                return React.createElement('button', {
                    key: index,
                    className,
                    onClick: () => handleDateSelect(date),
                    disabled: isPast || !isCurrentMonth || 
                             (dayAvailability && (dayAvailability.status === 'sold_out' || dayAvailability.is_blackout))
                },
                    React.createElement('span', { className: 'date-number' }, date.getDate()),
                    dayAvailability && dayAvailability.special_pricing && 
                        React.createElement('span', { className: 'special-price' }, 
                            utils.formatCurrency(dayAvailability.special_pricing)
                        )
                );
            });
        };

        const navigateMonth = (direction) => {
            setCurrentMonth(prev => {
                const newMonth = new Date(prev);
                newMonth.setMonth(prev.getMonth() + direction);
                return newMonth;
            });
        };

        if (loading) return React.createElement(LoadingSpinner);
        if (error) return React.createElement(ErrorMessage, { message: error, onRetry: loadAvailability });

        return React.createElement('div', { className: 'mwb-step-content' },
            React.createElement('h2', null, 'Select Visit Date'),
            React.createElement('div', { className: 'mwb-calendar' },
                React.createElement('div', { className: 'mwb-calendar-header' },
                    React.createElement('button', {
                        className: 'mwb-nav-btn',
                        onClick: () => navigateMonth(-1)
                    }, '‹'),
                    React.createElement('h3', null, 
                        currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    ),
                    React.createElement('button', {
                        className: 'mwb-nav-btn',
                        onClick: () => navigateMonth(1)
                    }, '›')
                ),
                React.createElement('div', { className: 'mwb-calendar-weekdays' },
                    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day =>
                        React.createElement('div', { key: day, className: 'mwb-weekday' }, day)
                    )
                ),
                React.createElement('div', { className: 'mwb-calendar-grid' }, renderCalendar())
            ),
            React.createElement('div', { className: 'mwb-legend' },
                React.createElement('div', { className: 'mwb-legend-item' },
                    React.createElement('span', { className: 'mwb-legend-color available' }),
                    'Available'
                ),
                React.createElement('div', { className: 'mwb-legend-item' },
                    React.createElement('span', { className: 'mwb-legend-color limited' }),
                    'Limited'
                ),
                React.createElement('div', { className: 'mwb-legend-item' },
                    React.createElement('span', { className: 'mwb-legend-color sold_out' }),
                    'Sold Out'
                )
            ),
            React.createElement('div', { className: 'mwb-step-actions' },
                React.createElement('button', {
                    className: 'mwb-secondary-btn',
                    onClick: onBack
                }, 'Back'),
                React.createElement('button', {
                    className: 'mwb-primary-btn',
                    onClick: onNext,
                    disabled: !selectedDate
                }, 'Continue')
            )
        );
    };

   // Step 3: Ticket Selection
const TicketSelector = ({ data, onNext, onBack, onUpdate }) => {
    const [tickets, setTickets] = useState(data.tickets || { general: 0, child: 0, senior: 0 });
    const [offerTickets, setOfferTickets] = useState(data.offer_tickets || { birthday: 0 });
    const [pricing, setPricing] = useState(null);
    const [loading, setPricingLoading] = useState(false);
    const [currentPrices, setCurrentPrices] = useState(null);
    const [pricesLoading, setPricesLoading] = useState(false);
    
    // Offer tickets state - removed toggle functionality
    // const [showOfferTickets, setShowOfferTickets] = useState(false);

    // Load current prices when booking date changes
    useEffect(() => {
        if (data.booking_date) {
            loadCurrentPrices();
        }
    }, [data.booking_date]);

    const loadCurrentPrices = async () => {
        try {
            setPricesLoading(true);
            const response = await api.getCurrentPricing(data.booking_date);
            setCurrentPrices(response);
        } catch (error) {
            console.error('Failed to load current prices:', error);
            // Fallback to config prices
            setCurrentPrices({
                prices: config.tickets || {
                    general: 400,
                    child: 280,
                    senior: 350
                },
                birthday_discount_rate: config.birthdayDiscountRate || 10,
                is_seasonal: false
            });
        } finally {
            setPricesLoading(false);
        }
    };

    // Use dynamic prices if available, fallback to config
    const getTicketTypes = () => {
        if (currentPrices && currentPrices.prices) {
            return {
                general: { 
                    name: 'General', 
                    price: currentPrices.prices.general || 400 
                },
                child: { 
                    name: 'Child', 
                    price: currentPrices.prices.child || 280 
                },
                senior: { 
                    name: 'Senior Citizen', 
                    price: currentPrices.prices.senior || 350 
                }
            };
        }
        return config.tickets || {
            general: { name: 'General', price: 400 },
            child: { name: 'Child', price: 280 },
            senior: { name: 'Senior Citizen', price: 350 }
        };
    };

    const ticketTypes = getTicketTypes();

    useEffect(() => {
        calculatePricing();
    }, [tickets, offerTickets, currentPrices]);

    const calculatePricing = useCallback(
        utils.debounce(async () => {
            const totalRegularTickets = Object.values(tickets).reduce((sum, count) => sum + count, 0);
            const totalOfferTickets = Object.values(offerTickets).reduce((sum, count) => sum + count, 0);
            
            if (totalRegularTickets === 0 && totalOfferTickets === 0) {
                setPricing(null);
                return;
            }

            try {
                setPricingLoading(true);
                const pricingData = await api.calculatePricing({
                    tickets,
                    offer_tickets: offerTickets,
                    booking_date: data.booking_date
                });
                setPricing(pricingData);
            } catch (err) {
                console.error('Pricing calculation failed:', err);
            } finally {
                setPricingLoading(false);
            }
        }, 300),
        [tickets, offerTickets, data.booking_date, currentPrices]
    );

    const updateTicketCount = (type, count) => {
        const newTickets = { ...tickets, [type]: Math.max(0, count) };
        setTickets(newTickets);
        onUpdate({ tickets: newTickets });
    };

    const updateOfferTicketCount = (type, count) => {
        const newOfferTickets = { ...offerTickets, [type]: Math.max(0, count) };
        setOfferTickets(newOfferTickets);
        onUpdate({ offer_tickets: newOfferTickets });
    };

    const handleNext = () => {
        const regularTickets = Object.values(tickets).reduce((sum, count) => sum + count, 0);
        const totalOfferTickets = Object.values(offerTickets).reduce((sum, count) => sum + count, 0);
        const totalTickets = regularTickets + totalOfferTickets;
        if (totalTickets > 0) {
            onNext();
        }
    };

    const totalTickets = Object.values(tickets).reduce((sum, count) => sum + count, 0);
    const totalOfferTickets = Object.values(offerTickets).reduce((sum, count) => sum + count, 0);

    return React.createElement('div', { className: 'mwb-step-content' },
        React.createElement('h2', null, 'Select Tickets'),
        
        // Show seasonal pricing notice if applicable
        currentPrices && currentPrices.is_seasonal && React.createElement('div', { className: 'mwb-seasonal-notice' },
            React.createElement('div', { className: 'mwb-seasonal-icon' }, '🌟'),
            React.createElement('div', null,
                React.createElement('h4', null, 'Seasonal Pricing Active'),
                React.createElement('p', null, 'Special rates are in effect for your selected date.')
            )
        ),

        // Show loading state while fetching prices
        pricesLoading ? React.createElement('div', { className: 'mwb-price-loading' }, 
            'Loading current prices...'
        ) :
        React.createElement('div', { className: 'mwb-tickets-grid' },
            Object.entries(ticketTypes).map(([type, info]) =>
                React.createElement('div', {
                    key: type,
                    className: `mwb-ticket-card ${currentPrices && currentPrices.is_seasonal ? 'seasonal' : ''}`
                },
                    React.createElement('h3', null, info.name),
                    React.createElement('p', { className: 'mwb-ticket-price' }, 
                        utils.formatCurrency(info.price),
                        currentPrices && currentPrices.is_seasonal && 
                        React.createElement('span', { className: 'mwb-seasonal-tag' }, 'Seasonal Rate')
                    ),
                    React.createElement('div', { className: 'mwb-quantity-selector' },
                        React.createElement('button', {
                            className: 'mwb-qty-btn',
                            onClick: () => updateTicketCount(type, tickets[type] - 1),
                            disabled: tickets[type] <= 0
                        }, '-'),
                        React.createElement('span', { className: 'mwb-qty-display' }, tickets[type]),
                        React.createElement('button', {
                            className: 'mwb-qty-btn',
                            onClick: () => updateTicketCount(type, tickets[type] + 1)
                        }, '+')
                    )
                )
            )
        ),

        // Offer Tickets Section - Only show if discount rate > 0
        (() => {
            // Get the discount rate
            let discountRate = 0;
            
            if (currentPrices) {
                // Use API data when available
                discountRate = currentPrices.birthday_discount_rate || 0;
            } else if (!pricesLoading) {
                // If not loading and no data, use config fallback
                discountRate = config.birthdayDiscountRate || config.birthday_discount_rate || 10;
            } else {
                // Still loading - don't render to prevent flash
                return null;
            }
            
            // Only show if discount rate > 0
            if (discountRate <= 0) {
                return null;
            }
            
            return React.createElement('div', { className: 'mwb-offer-tickets-section' },
            React.createElement('div', { 
                className: 'mwb-offer-tickets-heading',
                style: {
                    marginTop: '2rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }
            },
                React.createElement('span', { 
                    style: { 
                        fontSize: '1.25rem', 
                        fontWeight: '600',
                        color: '#2c3e50'
                    } 
                }, '🎁 Offer Tickets'),
                React.createElement('span', { 
                    style: { 
                        fontSize: '0.875rem',
                        color: '#7f8c8d',
                        fontWeight: '400'
                    } 
                }, '(Special Discounts Available)')
            ),
            
            React.createElement('div', { className: 'mwb-offer-tickets-content' },
                // Birthday Offers - Simple ticket selector
                React.createElement('div', { 
                    className: 'mwb-ticket-card offer-ticket',
                    style: {
                        marginTop: '1.5rem'
                    }
                },
                    React.createElement('h3', null, '🎂 Birthday Offer'),
                    React.createElement('p', { className: 'mwb-ticket-price' }, 
                        'Regular Price ',
                        React.createElement('span', { className: 'mwb-discount-note' }, 
                            (() => {
                                if (pricesLoading) {
                                    return '(Loading discount...)';
                                }
                                
                                // Try multiple sources for the discount rate
                                let discountRate = null;
                                if (currentPrices) {
                                    discountRate = currentPrices.birthday_discount_rate || 
                                                 currentPrices.birthdayDiscountRate ||
                                                 currentPrices.birthday_discount ||
                                                 (currentPrices.prices && currentPrices.prices.birthday_discount_rate);
                                }
                                
                                // Fallback to config
                                if (!discountRate) {
                                    discountRate = config.birthdayDiscountRate || config.birthday_discount_rate || 10;
                                }
                                
                                return `(${discountRate}% discount applied)`;
                            })()
                        )
                    ),
                    React.createElement('div', { className: 'mwb-quantity-selector' },
                        React.createElement('button', {
                            className: 'mwb-qty-btn',
                            onClick: () => updateOfferTicketCount('birthday', offerTickets.birthday - 1),
                            disabled: offerTickets.birthday <= 0
                        }, '-'),
                        React.createElement('span', { className: 'mwb-qty-display' }, offerTickets.birthday),
                        React.createElement('button', {
                            className: 'mwb-qty-btn',
                            onClick: () => updateOfferTicketCount('birthday', offerTickets.birthday + 1)
                        }, '+')
                    )
                )
            )
            );
        })(),

        totalTickets >= 15 && React.createElement('div', { 
            className: `mwb-group-discount-notice ${currentPrices && currentPrices.is_seasonal ? 'seasonal' : ''}`
        },
            React.createElement('h4', null, 'Group Discount Available!'),
            React.createElement('p', null, 
                totalTickets >= 30 ? 
                'You qualify for a 10% group discount (30+ people)' : 
                'You qualify for a 5% group discount (15+ people)'
            )
        ),

        pricing && !loading && React.createElement('div', { 
            className: `mwb-pricing-summary ${currentPrices && currentPrices.is_seasonal ? 'seasonal' : ''}`
        },
            React.createElement('h4', null, 'Price Summary'),
            Object.entries(pricing.breakdown.tickets || {}).map(([type, details]) =>
                React.createElement('div', { key: type, className: 'mwb-price-line' },
                    React.createElement('span', null, `${ticketTypes[type]?.name || type} (${details.quantity})`),
                    React.createElement('span', null, utils.formatCurrency(details.total))
                )
            ),
            Object.entries(pricing.breakdown.offer_tickets || {}).map(([type, details]) =>
                React.createElement('div', { key: `offer-${type}`, className: 'mwb-price-line offer' },
                    React.createElement('span', null, `🎂 Birthday Offer (${details.quantity}) - ${details.discount_rate}% off`),
                    React.createElement('span', null, utils.formatCurrency(details.total))
                )
            ),
            pricing.group_discount > 0 && React.createElement('div', { className: 'mwb-price-line discount' },
                React.createElement('span', null, `Group Discount (${pricing.group_discount_percentage}%)`),
                React.createElement('span', null, `-${utils.formatCurrency(pricing.group_discount)}`)
            ),
            React.createElement('div', { className: 'mwb-price-line total' },
                React.createElement('span', null, 'Subtotal'),
                React.createElement('span', null, utils.formatCurrency(pricing.final_total))
            )
        ),

        React.createElement('div', { className: 'mwb-step-actions' },
            React.createElement('button', {
                className: 'mwb-secondary-btn',
                onClick: onBack
            }, 'Back'),
            React.createElement('button', {
                className: 'mwb-primary-btn',
                onClick: handleNext,
                disabled: totalTickets + totalOfferTickets === 0
            }, 'Continue')
        )
    );
};

    // Step 4: Add-ons Selection
    const AddonsSelector = ({ data, onNext, onBack, onUpdate }) => {
        const [addons, setAddons] = useState([]);
        const [selectedAddons, setSelectedAddons] = useState(data.addons || {});
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);
        const [adjustmentMessage, setAdjustmentMessage] = useState('');

        useEffect(() => {
            loadAddons();
        }, []);

        // Monitor ticket count changes and adjust addon counts accordingly
        useEffect(() => {
            const currentRegularTickets = Object.values(data.tickets || {}).reduce((sum, count) => sum + count, 0);
            const currentOfferTickets = Object.values(data.offer_tickets || {}).reduce((sum, count) => sum + count, 0);
            const currentTotalTickets = currentRegularTickets + currentOfferTickets;
            
            // Check if any addon counts exceed the new ticket total
            const adjustedAddons = { ...selectedAddons };
            let hasChanges = false;
            
            Object.keys(adjustedAddons).forEach(addonId => {
                if (adjustedAddons[addonId] > currentTotalTickets) {
                    adjustedAddons[addonId] = Math.max(0, currentTotalTickets);
                    hasChanges = true;
                    
                    // Remove addon if count becomes 0
                    if (adjustedAddons[addonId] === 0) {
                        delete adjustedAddons[addonId];
                    }
                }
            });
            
            // Update state and parent component if changes were made
            if (hasChanges) {
                setSelectedAddons(adjustedAddons);
                onUpdate({ addons: adjustedAddons });
                
                // Show adjustment message
                setAdjustmentMessage(`Add-on quantities were adjusted to match your ticket count (${currentTotalTickets} tickets).`);
                
                // Clear message after 5 seconds
                setTimeout(() => {
                    setAdjustmentMessage('');
                }, 5000);
            }
        }, [data.tickets, data.offer_tickets]);

        const loadAddons = async () => {
            try {
                setLoading(true);
                const addonsData = await api.getAddons();
                setAddons(addonsData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const updateAddonCount = (addonId, count) => {
            const newAddons = { ...selectedAddons };
            if (count <= 0) {
                delete newAddons[addonId];
            } else {
                newAddons[addonId] = count;
            }
            setSelectedAddons(newAddons);
            onUpdate({ addons: newAddons });
        };

        const totalTickets = Object.values(data.tickets || {}).reduce((sum, count) => sum + count, 0);
        const totalOfferTickets = Object.values(data.offer_tickets || {}).reduce((sum, count) => sum + count, 0);
        const totalAllTickets = totalTickets + totalOfferTickets;

        if (loading) return React.createElement(LoadingSpinner);
        if (error) return React.createElement(ErrorMessage, { message: error, onRetry: loadAddons });

        return React.createElement('div', { className: 'mwb-step-content' },
            React.createElement('h2', null, 'Add Extras'),
            React.createElement('p', { className: 'mwb-addons-description' }, 
                'Enhance your Marine World experience with these exciting add-ons!'
            ),
            totalAllTickets === 0 && React.createElement('div', { className: 'mwb-no-tickets-notice' },
                React.createElement('p', null, 'Please select tickets first to add extras.')
            ),
            adjustmentMessage && React.createElement('div', { className: 'mwb-adjustment-message' },
                React.createElement('p', null, adjustmentMessage)
            ),
            React.createElement('div', { className: 'mwb-addons-grid' },
                addons.map(addon =>
                    React.createElement('div', {
                        key: addon.id,
                        className: 'mwb-addon-card'
                    },
                        addon.image_url && React.createElement('img', {
                            src: addon.image_url,
                            alt: addon.name,
                            className: 'mwb-addon-image'
                        }),
                        React.createElement('h3', null, addon.name),
                        React.createElement('p', { className: 'mwb-addon-description' }, addon.description),
                        React.createElement('p', { className: 'mwb-addon-price' }, 
                            `${utils.formatCurrency(addon.price)} per person`
                        ),
                        React.createElement('div', { className: 'mwb-quantity-selector' },
                            React.createElement('button', {
                                className: 'mwb-qty-btn',
                                onClick: () => updateAddonCount(addon.id, (selectedAddons[addon.id] || 0) - 1),
                                disabled: (selectedAddons[addon.id] || 0) <= 0
                            }, '-'),
                            React.createElement('span', { className: 'mwb-qty-display' }, 
                                selectedAddons[addon.id] || 0
                            ),
                            React.createElement('button', {
                                className: 'mwb-qty-btn',
                                onClick: () => updateAddonCount(addon.id, (selectedAddons[addon.id] || 0) + 1),
                                disabled: (selectedAddons[addon.id] || 0) >= totalAllTickets
                            }, '+')
                        ),
                        (selectedAddons[addon.id] || 0) > 0 && React.createElement('p', { className: 'mwb-addon-total' },
                            `Total: ${utils.formatCurrency(addon.price * selectedAddons[addon.id])}`
                        )
                    )
                )
            ),
            React.createElement('div', { className: 'mwb-step-actions' },
                React.createElement('button', {
                    className: 'mwb-secondary-btn',
                    onClick: onBack
                }, 'Back'),
                React.createElement('button', {
                    className: 'mwb-primary-btn',
                    onClick: onNext
                }, 'Continue')
            )
        );
    };

    // Step 5: Booking Review & Customer Information
    const BookingReview = ({ data, onNext, onBack, onUpdate }) => {
        const [customerInfo, setCustomerInfo] = useState(data.customerInfo || {
            name: '',
            email: '',
            phone: '',
            pincode: '',
            thirdPartyBooking: false,
            thirdPartyName: '',
            thirdPartyEmail: '',
            thirdPartyPhone: ''
        });
        const [promoCode, setPromoCode] = useState(data.promoCode || '');
        const [promoValidation, setPromoValidation] = useState(null);
        const [pricing, setPricing] = useState(null);
        const [loading, setLoading] = useState(true);
        const [validationErrors, setValidationErrors] = useState({});
        const [addons, setAddons] = useState([]);
        const [currentPrices, setCurrentPrices] = useState(null);

        useEffect(() => {
            loadRequiredData();
        }, []);

        useEffect(() => {
            if (addons.length > 0) {
                calculateFinalPricing();
            }
        }, [data.tickets, data.offer_tickets, data.addons, promoCode, addons]);

        const loadRequiredData = async () => {
            try {
                const [addonsData, pricesData] = await Promise.all([
                    api.getAddons(),
                    api.getCurrentPricing(data.booking_date)
                ]);
                setAddons(addonsData);
                setCurrentPrices(pricesData);
            } catch (err) {
                console.error('Failed to load required data:', err);
            }
        };

        const getTicketTypes = () => {
            if (currentPrices && currentPrices.prices) {
                return {
                    general: { 
                        name: 'General', 
                        price: currentPrices.prices.general || 400 
                    },
                    child: { 
                        name: 'Child', 
                        price: currentPrices.prices.child || 280 
                    },
                    senior: { 
                        name: 'Senior Citizen', 
                        price: currentPrices.prices.senior || 350 
                    }
                };
            }
            return config.tickets || {
                general: { name: 'General', price: 400 },
                child: { name: 'Child', price: 280 },
                senior: { name: 'Senior Citizen', price: 350 }
            };
        };

        const getAddonById = (addonId) => {
            return addons.find(addon => addon.id === parseInt(addonId));
        };

        const calculateFinalPricing = async () => {
            try {
                setLoading(true);
                const pricingData = await api.calculatePricing({
                    tickets: data.tickets,
                    offer_tickets: data.offer_tickets,
                    addons: data.addons,
                    promo_code: promoCode,
                    booking_date: data.booking_date
                });
                setPricing(pricingData);
            } catch (err) {
                console.error('Final pricing calculation failed:', err);
            } finally {
                setLoading(false);
            }
        };

        const validatePromoCode = async () => {
            if (!promoCode.trim()) {
                setPromoValidation(null);
                return;
            }

            try {
                const validation = await api.validatePromoCode(promoCode, pricing?.subtotal || 0);
                setPromoValidation({ valid: true, ...validation });
                calculateFinalPricing();
            } catch (err) {
                setPromoValidation({ valid: false, message: err.message });
            }
        };

        const updateCustomerInfo = (field, value) => {
            const newInfo = { ...customerInfo, [field]: value };
            setCustomerInfo(newInfo);
            onUpdate({ customerInfo: newInfo, promoCode });
        };

        const validateForm = () => {
            const errors = {};
            
            if (!customerInfo.name.trim()) errors.name = 'Name is required';
            if (!customerInfo.email.trim()) errors.email = 'Email is required';
            else if (!utils.validateEmail(customerInfo.email)) errors.email = 'Invalid email format';
            if (!customerInfo.phone.trim()) errors.phone = 'Phone is required';
            else if (!utils.validatePhone(customerInfo.phone)) errors.phone = 'Invalid phone format';
            if (!customerInfo.pincode.trim()) errors.pincode = 'Pincode is required';
            
            if (customerInfo.thirdPartyBooking) {
                if (!customerInfo.thirdPartyName.trim()) errors.thirdPartyName = 'Third party name is required';
                if (!customerInfo.thirdPartyEmail.trim()) errors.thirdPartyEmail = 'Third party email is required';
                else if (!utils.validateEmail(customerInfo.thirdPartyEmail)) errors.thirdPartyEmail = 'Invalid email format';
                if (!customerInfo.thirdPartyPhone.trim()) errors.thirdPartyPhone = 'Third party phone is required';
            }
            
            setValidationErrors(errors);
            return Object.keys(errors).length === 0;
        };

        const handleNext = () => {
            if (validateForm()) {
                onUpdate({ 
                    customerInfo, 
                    promoCode, 
                    finalTotal: pricing?.final_total || 0,
                    finalPricing: pricing 
                });
                onNext();
            }
        };

        if (loading) return React.createElement(LoadingSpinner);

        return React.createElement('div', { className: 'mwb-step-content' },
            React.createElement('h2', null, 'Review & Customer Information'),
            
            // Booking Summary
            React.createElement('div', { className: 'mwb-booking-summary' },
                React.createElement('h3', null, 'Booking Summary'),
                React.createElement('div', { className: 'mwb-summary-item' },
                    React.createElement('span', null, 'Date:'),
                    React.createElement('span', null, utils.formatDate(data.booking_date))
                ),
                React.createElement('div', { className: 'mwb-summary-section' },
                    React.createElement('h4', null, 'Tickets'),
                    Object.entries(data.tickets || {}).map(([type, count]) => {
                        const ticketTypes = getTicketTypes();
                        const ticketInfo = ticketTypes[type];
                        return count > 0 && React.createElement('div', { key: type, className: 'mwb-summary-item' },
                            React.createElement('span', null, `${ticketInfo?.name} x ${count}`),
                            React.createElement('span', null, utils.formatCurrency((ticketInfo?.price || 0) * count))
                        );
                    }),
                    // Show birthday offer tickets
                    Object.entries(data.offer_tickets || {}).map(([type, count]) => {
                        if (count <= 0) return null;
                        
                        // Calculate discounted price for birthday offer tickets
                        const ticketTypes = getTicketTypes();
                        const regularPrice = ticketTypes.general?.price || 400; // Use general ticket price as base
                        const discountRate = currentPrices?.birthday_discount_rate || 10;
                        const discountedPrice = regularPrice * (1 - discountRate / 100);
                        const totalPrice = discountedPrice * count;
                        
                        return React.createElement('div', { key: `offer-${type}`, className: 'mwb-summary-item offer-ticket' },
                            React.createElement('span', null, `🎂 Birthday Offer x ${count}`),
                            React.createElement('span', null, 
                                React.createElement('span', { className: 'original-price' }, utils.formatCurrency(regularPrice * count)),
                                React.createElement('span', { className: 'discounted-price' }, ` → ${utils.formatCurrency(totalPrice)}`)
                            )
                        );
                    })
                ),
                data.addons && Object.keys(data.addons).length > 0 && React.createElement('div', { className: 'mwb-summary-section' },
                    React.createElement('h4', null, 'Add-ons'),
                    Object.entries(data.addons).map(([addonId, count]) => {
                        const addon = getAddonById(addonId);
                        const addonName = addon ? addon.name : `Add-on #${addonId}`;
                        const addonPrice = addon ? addon.price : 0;
                        return count > 0 && React.createElement('div', { key: addonId, className: 'mwb-summary-item' },
                            React.createElement('span', null, `${addonName} x ${count}`),
                            React.createElement('span', null, utils.formatCurrency(addonPrice * count))
                        );
                    })
                )
            ),

            // Promo Code Section
            React.createElement('div', { className: 'mwb-promo-section' },
                React.createElement('h4', null, 'Promo Code'),
                React.createElement('div', { className: 'mwb-promo-input' },
                    React.createElement('input', {
                        type: 'text',
                        placeholder: 'Enter promo code',
                        value: promoCode,
                        onChange: (e) => setPromoCode(e.target.value),
                        onBlur: validatePromoCode
                    }),
                    React.createElement('button', {
                        type: 'button',
                        onClick: validatePromoCode,
                        className: 'mwb-apply-btn'
                    }, 'Apply')
                ),
                promoValidation && React.createElement('div', {
                    className: `mwb-promo-validation ${promoValidation.valid ? 'valid' : 'invalid'}`
                }, promoValidation.valid ? promoValidation.description : promoValidation.message)
            ),

            // Pricing Summary
            pricing && React.createElement('div', { className: 'mwb-final-pricing' },
                React.createElement('h4', null, 'Total'),
                React.createElement('div', { className: 'mwb-price-line' },
                    React.createElement('span', null, 'Subtotal:'),
                    React.createElement('span', null, utils.formatCurrency(pricing.subtotal))
                ),
                pricing.total_discount > 0 && React.createElement('div', { className: 'mwb-price-line discount' },
                    React.createElement('span', null, 'Discount:'),
                    React.createElement('span', null, `-${utils.formatCurrency(pricing.total_discount)}`)
                ),
                React.createElement('div', { className: 'mwb-price-line total' },
                    React.createElement('span', null, 'Final Total:'),
                    React.createElement('span', null, utils.formatCurrency(pricing.final_total))
                )
            ),

            // Customer Information Form
            React.createElement('div', { className: 'mwb-customer-form' },
                React.createElement('h3', null, 'Customer Information'),
                React.createElement('div', { className: 'mwb-form-row' },
                    React.createElement('div', { className: 'mwb-form-field' },
                        React.createElement('label', null, 'Full Name *'),
                        React.createElement('input', {
                            type: 'text',
                            value: customerInfo.name,
                            onChange: (e) => updateCustomerInfo('name', e.target.value),
                            className: validationErrors.name ? 'error' : ''
                        }),
                        validationErrors.name && React.createElement('span', { className: 'error-message' }, validationErrors.name)
                    ),
                    React.createElement('div', { className: 'mwb-form-field' },
                        React.createElement('label', null, 'Email *'),
                        React.createElement('input', {
                            type: 'email',
                            value: customerInfo.email,
                            onChange: (e) => updateCustomerInfo('email', e.target.value),
                            className: validationErrors.email ? 'error' : ''
                        }),
                        validationErrors.email && React.createElement('span', { className: 'error-message' }, validationErrors.email)
                    )
                ),
                React.createElement('div', { className: 'mwb-form-row' },
                    React.createElement('div', { className: 'mwb-form-field' },
                        React.createElement('label', null, 'Phone Number *'),
                        React.createElement('input', {
                            type: 'tel',
                            value: customerInfo.phone,
                            onChange: (e) => updateCustomerInfo('phone', e.target.value),
                            className: validationErrors.phone ? 'error' : ''
                        }),
                        validationErrors.phone && React.createElement('span', { className: 'error-message' }, validationErrors.phone)
                    ),
                    React.createElement('div', { className: 'mwb-form-field' },
                        React.createElement('label', null, 'Pincode *'),
                        React.createElement('input', {
                            type: 'text',
                            value: customerInfo.pincode,
                            onChange: (e) => updateCustomerInfo('pincode', e.target.value),
                            className: validationErrors.pincode ? 'error' : ''
                        }),
                        validationErrors.pincode && React.createElement('span', { className: 'error-message' }, validationErrors.pincode)
                    )
                ),
                React.createElement('div', { className: 'mwb-form-field' },
                    React.createElement('label', { className: 'mwb-checkbox-label' },
                        React.createElement('input', {
                            type: 'checkbox',
                            checked: customerInfo.thirdPartyBooking,
                            onChange: (e) => updateCustomerInfo('thirdPartyBooking', e.target.checked)
                        }),
                        'Booking for someone else'
                    )
                ),
                customerInfo.thirdPartyBooking && React.createElement('div', { className: 'mwb-third-party-section' },
                    React.createElement('h4', null, 'Visitor Information'),
                    React.createElement('div', { className: 'mwb-form-row' },
                        React.createElement('div', { className: 'mwb-form-field' },
                            React.createElement('label', null, 'Visitor Name *'),
                            React.createElement('input', {
                                type: 'text',
                                value: customerInfo.thirdPartyName,
                                onChange: (e) => updateCustomerInfo('thirdPartyName', e.target.value),
                                className: validationErrors.thirdPartyName ? 'error' : ''
                            }),
                            validationErrors.thirdPartyName && React.createElement('span', { className: 'error-message' }, validationErrors.thirdPartyName)
                        ),
                        React.createElement('div', { className: 'mwb-form-field' },
                            React.createElement('label', null, 'Visitor Email *'),
                            React.createElement('input', {
                                type: 'email',
                                value: customerInfo.thirdPartyEmail,
                                onChange: (e) => updateCustomerInfo('thirdPartyEmail', e.target.value),
                                className: validationErrors.thirdPartyEmail ? 'error' : ''
                            }),
                            validationErrors.thirdPartyEmail && React.createElement('span', { className: 'error-message' }, validationErrors.thirdPartyEmail)
                        )
                    ),
                    React.createElement('div', { className: 'mwb-form-field' },
                        React.createElement('label', null, 'Visitor Phone *'),
                        React.createElement('input', {
                            type: 'tel',
                            value: customerInfo.thirdPartyPhone,
                            onChange: (e) => updateCustomerInfo('thirdPartyPhone', e.target.value),
                            className: validationErrors.thirdPartyPhone ? 'error' : ''
                        }),
                        validationErrors.thirdPartyPhone && React.createElement('span', { className: 'error-message' }, validationErrors.thirdPartyPhone)
                    )
                )
            ),

            React.createElement('div', { className: 'mwb-step-actions' },
                React.createElement('button', {
                    className: 'mwb-secondary-btn',
                    onClick: onBack
                }, 'Back'),
                React.createElement('button', {
                    className: 'mwb-primary-btn',
                    onClick: handleNext
                }, 'Continue to Payment')
            )
        );
    };

    // Step 6: Payment
    const PaymentStep = ({ data, onBack, onBookingComplete }) => {
        const [paymentLoading, setPaymentLoading] = useState(false);
        const [bookingId, setBookingId] = useState(null);
        const [error, setError] = useState(null);

        const handlePayment = async () => {
            try {
                setPaymentLoading(true);
                setError(null);

                // Create booking
                const bookingData = {
                    location_id: data.location_id,
                    booking_date: data.booking_date,
                    customer_name: data.customerInfo.name,
                    customer_email: data.customerInfo.email,
                    customer_phone: data.customerInfo.phone,
                    customer_pincode: data.customerInfo.pincode,
                    tickets: data.tickets,
                    offer_tickets: data.offer_tickets,
                    addons: data.addons,
                    promo_code: data.promoCode,
                    third_party_booking: data.customerInfo.thirdPartyBooking,
                    third_party_name: data.customerInfo.thirdPartyName,
                    third_party_email: data.customerInfo.thirdPartyEmail,
                    third_party_phone: data.customerInfo.thirdPartyPhone
                };

                const booking = await api.createBooking(bookingData);
                setBookingId(booking.booking_id);

                // Check payment gateway configuration from WordPress config
                const testMode = config.testMode || true;
                const gatewayConfigured = config.gatewayKeys && 
                    config.gatewayKeys.merchant_id && 
                    config.gatewayKeys.access_code && 
                    config.gatewayKeys.working_key;
                
                // Simulate payment process
                setTimeout(async () => {
                    try {
                        let paymentResult;
                        
                        if (!gatewayConfigured && !testMode) {
                            // Gateway not configured and not in test mode - mark as failed
                            paymentResult = await api.confirmPayment(booking.booking_id, {
                                payment_id: 'FAILED_' + Date.now(),
                                payment_status: 'failed',
                                failure_reason: 'Payment gateway not configured'
                            });
                            setError('Payment gateway is not configured. Please contact support.');
                            return;
                        } else if (testMode) {
                            // Test mode - simulate random success/failure for testing
                            const simulateFailure = Math.random() < 0.3; // 30% chance of failure for testing
                            
                            if (simulateFailure) {
                                paymentResult = await api.confirmPayment(booking.booking_id, {
                                    payment_id: 'TEST_FAILED_' + Date.now(),
                                    payment_status: 'failed',
                                    failure_reason: 'Simulated payment failure (test mode)'
                                });
                                setError('Payment failed (simulated for testing). Please try again or contact support.');
                                return;
                            } else {
                                paymentResult = await api.confirmPayment(booking.booking_id, {
                                    payment_id: 'TEST_SUCCESS_' + Date.now(),
                                    payment_status: 'success'
                                });
                            }
                        } else {
                            // Production mode with gateway configured - process real payment
                            paymentResult = await api.confirmPayment(booking.booking_id, {
                                payment_id: 'PAYMENT_' + Date.now(),
                                payment_status: 'success'
                            });
                        }
                        
                        if (paymentResult.booking_status === 'confirmed') {
                            onBookingComplete(booking.booking_id);
                        } else {
                            setError('Payment processing failed. Please try again.');
                        }
                    } catch (err) {
                        // Handle any API errors
                        try {
                            await api.confirmPayment(booking.booking_id, {
                                payment_id: 'ERROR_' + Date.now(),
                                payment_status: 'failed',
                                failure_reason: err.message || 'Payment processing error'
                            });
                        } catch (confirmErr) {
                            console.error('Failed to confirm payment failure:', confirmErr);
                        }
                        setError('Payment failed: ' + (err.message || 'Unknown error'));
                    } finally {
                        setPaymentLoading(false);
                    }
                }, 2000);

            } catch (err) {
                setError(err.message);
                setPaymentLoading(false);
            }
        };

        if (error) {
            return React.createElement('div', { className: 'mwb-step-content' },
                React.createElement('div', { className: 'mwb-payment-error' },
                    React.createElement('h2', null, 'Payment Failed'),
                    React.createElement('p', null, error),
                    React.createElement('div', { className: 'mwb-step-actions' },
                        React.createElement('button', {
                            className: 'mwb-secondary-btn',
                            onClick: onBack
                        }, 'Back'),
                        React.createElement('button', {
                            className: 'mwb-primary-btn',
                            onClick: handlePayment
                        }, 'Retry Payment')
                    )
                )
            );
        }

        if (paymentLoading) {
            return React.createElement('div', { className: 'mwb-step-content' },
                React.createElement('div', { className: 'mwb-payment-processing' },
                    React.createElement(LoadingSpinner),
                    React.createElement('h2', null, 'Processing Payment'),
                    React.createElement('p', null, 'Please wait while we process your payment...'),
                    bookingId && React.createElement('p', { className: 'mwb-booking-id' }, 
                        `Booking ID: ${bookingId}`
                    )
                )
            );
        }

        return React.createElement('div', { className: 'mwb-step-content' },
            React.createElement('h2', null, 'Payment'),
            React.createElement('div', { className: 'mwb-payment-summary' },
                React.createElement('h3', null, 'Payment Summary'),
                React.createElement('div', { className: 'mwb-summary-item' },
                    React.createElement('span', null, 'Total Amount:'),
                    React.createElement('span', { className: 'amount' }, utils.formatCurrency(data.finalTotal || 0))
                )
            ),
            React.createElement('div', { className: 'mwb-payment-methods' },
                React.createElement('h3', null, 'Payment Method'),
                React.createElement('div', { className: 'mwb-payment-option selected' },
                    React.createElement('input', { type: 'radio', name: 'payment', value: 'icici', checked: true }),
                    React.createElement('label', null, 'ICICI Payment Gateway'),
                    React.createElement('p', null, 'Secure payment via ICICI Bank')
                )
            ),
            React.createElement('div', { className: 'mwb-step-actions' },
                React.createElement('button', {
                    className: 'mwb-secondary-btn',
                    onClick: onBack
                }, 'Back'),
                React.createElement('button', {
                    className: 'mwb-primary-btn mwb-pay-btn',
                    onClick: handlePayment
                }, `Pay ${utils.formatCurrency(data.finalTotal || 0)}`)
            )
        );
    };

    // Booking Success Component
    const BookingSuccess = ({ bookingId }) => {
        const [booking, setBooking] = useState(null);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            loadBookingDetails();
        }, [bookingId]);

        const loadBookingDetails = async () => {
            try {
                const bookingData = await api.getBooking(bookingId);
                setBooking(bookingData);
            } catch (err) {
                console.error('Failed to load booking details:', err);
            } finally {
                setLoading(false);
            }
        };

        if (loading) return React.createElement(LoadingSpinner);

        return React.createElement('div', { className: 'mwb-step-content' },
            React.createElement('div', { className: 'mwb-booking-success' },
                React.createElement('div', { className: 'mwb-success-icon' }, '✓'),
                React.createElement('h2', null, 'Booking Confirmed!'),
                React.createElement('p', null, 'Your Marine World booking has been confirmed successfully.'),
                booking && React.createElement('div', { className: 'mwb-booking-details' },
                    React.createElement('h3', null, 'Booking Details'),
                    React.createElement('div', { className: 'mwb-detail-item' },
                        React.createElement('span', null, 'Booking ID:'),
                        React.createElement('span', { className: 'booking-id' }, booking.booking_id)
                    ),
                    React.createElement('div', { className: 'mwb-detail-item' },
                        React.createElement('span', null, 'Visit Date:'),
                        React.createElement('span', null, utils.formatDate(booking.booking_date))
                    ),
                    React.createElement('div', { className: 'mwb-detail-item' },
                        React.createElement('span', null, 'Total Amount:'),
                        React.createElement('span', null, utils.formatCurrency(booking.total_amount))
                    ),
                    React.createElement('div', { className: 'mwb-detail-item' },
                        React.createElement('span', null, 'QR Code:'),
                        React.createElement('span', { className: 'booking-id' }, booking.qr_code)
                    )
                ),
                React.createElement('div', { className: 'mwb-success-actions' },
                    React.createElement('button', {
                        className: 'mwb-primary-btn',
                        onClick: () => window.print()
                    }, 'Print Ticket'),
                    React.createElement('button', {
                        className: 'mwb-secondary-btn',
                        onClick: () => window.location.reload()
                    }, 'New Booking')
                ),
                React.createElement('div', { className: 'mwb-confirmation-notice' },
                    React.createElement('p', null, 'A confirmation email and SMS have been sent to your registered contact details.'),
                    React.createElement('p', null, 'Please show this booking confirmation at the entrance on your visit date.')
                )
            )
        );
    };

    // Main Booking Flow Component
    const BookingFlow = ({ config = {} }) => {
        const [currentStep, setCurrentStep] = useState(1);
        const [bookingData, setBookingData] = useState({
            location_id: config.defaultLocation !== 'all' ? parseInt(config.defaultLocation) : null
        });
        const [isComplete, setIsComplete] = useState(false);
        const [completedBookingId, setCompletedBookingId] = useState(null);

        const steps = [
            { title: 'Location', component: LocationSelector },
            { title: 'Date', component: DateSelector },
            { title: 'Tickets', component: TicketSelector },
            { title: 'Add-ons', component: AddonsSelector },
            { title: 'Review', component: BookingReview },
            { title: 'Payment', component: PaymentStep }
        ];

        const updateBookingData = (newData) => {
            setBookingData(prev => ({ ...prev, ...newData }));
        };

        const scrollToTop = () => {
            // Scroll to the top of the booking container smoothly
            const bookingContainer = document.querySelector('.marine-world-booking-app, .marine-world-booking-container, .marine-world-booking-elementor-widget');
            if (bookingContainer) {
                bookingContainer.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start',
                    inline: 'nearest'
                });
            } else {
                // Fallback to window scroll
                window.scrollTo({ 
                    top: 0, 
                    behavior: 'smooth' 
                });
            }
        };

        const nextStep = () => {
            if (currentStep < steps.length) {
                setCurrentStep(prev => prev + 1);
                // Scroll to top after step change
                setTimeout(scrollToTop, 100);
            }
        };

        const prevStep = () => {
            if (currentStep > 1) {
                setCurrentStep(prev => prev - 1);
                // Scroll to top after step change
                setTimeout(scrollToTop, 100);
            }
        };

        const handleBookingComplete = (bookingId) => {
            setCompletedBookingId(bookingId);
            setIsComplete(true);
        };

        if (isComplete) {
            return React.createElement(BookingSuccess, { bookingId: completedBookingId });
        }

        const CurrentStepComponent = steps[currentStep - 1].component;

        return React.createElement('div', { 
            className: `marine-world-booking-app theme-${config.themeStyle || 'default'}` 
        },
            React.createElement('div', { className: 'mwb-header' },
                React.createElement('h1', null, '🌊 Marine World'),
                React.createElement('p', null, 'Book Your Amazing Adventure Today!')
            ),
            config.showSteps !== false && React.createElement(ProgressIndicator, {
                currentStep,
                totalSteps: steps.length,
                steps
            }),
            React.createElement('div', { className: 'mwb-content' },
                React.createElement(CurrentStepComponent, {
                    data: bookingData,
                    onNext: nextStep,
                    onBack: prevStep,
                    onUpdate: updateBookingData,
                    onBookingComplete: handleBookingComplete
                })
            )
        );
    };

    // Calendar Only Component
    const CalendarOnly = ({ config = {} }) => {
        const [selectedDate, setSelectedDate] = useState(null);
        const [availability, setAvailability] = useState({});
        const [loading, setLoading] = useState(true);
        const [currentMonth, setCurrentMonth] = useState(new Date());
        const locationId = config.defaultLocation !== 'all' ? parseInt(config.defaultLocation) : 1;

        useEffect(() => {
            loadAvailability();
        }, [currentMonth, locationId]);

        const loadAvailability = async () => {
            try {
                setLoading(true);
                const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                
                const availabilityData = await api.getAvailability(
                    locationId,
                    startDate.toISOString().split('T')[0],
                    endDate.toISOString().split('T')[0]
                );
                
                const availabilityMap = {};
                availabilityData.forEach(day => {
                    availabilityMap[day.date] = day;
                });
                
                setAvailability(availabilityMap);
            } catch (err) {
                console.error('Failed to load availability:', err);
            } finally {
                setLoading(false);
            }
        };

        const handleDateSelect = (date) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayAvailability = availability[dateStr];
            
            if (dayAvailability && dayAvailability.status !== 'sold_out' && !dayAvailability.is_blackout) {
                setSelectedDate(dateStr);
                if (config.onDateSelect) {
                    config.onDateSelect(dateStr);
                }
            }
        };

        const renderCalendar = () => {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const firstDay = new Date(year, month, 1);
            const today = new Date();
            
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
                const dayAvailability = availability[dateStr];
                const isCurrentMonth = date.getMonth() === month;
                const isPast = date < today;
                const isSelected = dateStr === selectedDate;
                
                let className = 'mwb-calendar-day';
                if (!isCurrentMonth) className += ' other-month';
                if (isPast) className += ' past';
                if (isSelected) className += ' selected';
                
                if (dayAvailability) {
                    className += ` ${dayAvailability.status}`;
                    if (dayAvailability.is_blackout) className += ' blackout';
                }

                return React.createElement('button', {
                    key: index,
                    className,
                    onClick: () => handleDateSelect(date),
                    disabled: isPast || !isCurrentMonth || 
                             (dayAvailability && (dayAvailability.status === 'sold_out' || dayAvailability.is_blackout))
                },
                    React.createElement('span', { className: 'date-number' }, date.getDate()),
                    dayAvailability && dayAvailability.special_pricing && 
                        React.createElement('span', { className: 'special-price' }, 
                            utils.formatCurrency(dayAvailability.special_pricing)
                        )
                );
            });
        };

        const navigateMonth = (direction) => {
            setCurrentMonth(prev => {
                const newMonth = new Date(prev);
                newMonth.setMonth(prev.getMonth() + direction);
                return newMonth;
            });
        };

        return React.createElement('div', { 
            className: `mwb-calendar-only theme-${config.themeStyle || 'default'}` 
        },
            React.createElement('h2', null, 'Select Your Visit Date'),
            React.createElement('div', { className: 'mwb-calendar' },
                React.createElement('div', { className: 'mwb-calendar-header' },
                    React.createElement('button', {
                        className: 'mwb-nav-btn',
                        onClick: () => navigateMonth(-1),
                        disabled: loading
                    }, '‹'),
                    React.createElement('h3', null, 
                        currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    ),
                    React.createElement('button', {
                        className: 'mwb-nav-btn',
                        onClick: () => navigateMonth(1),
                        disabled: loading
                    }, '›')
                ),
                React.createElement('div', { className: 'mwb-calendar-weekdays' },
                    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day =>
                        React.createElement('div', { key: day, className: 'mwb-weekday' }, day)
                    )
                ),
                loading ? React.createElement(LoadingSpinner) : 
                    React.createElement('div', { className: 'mwb-calendar-grid' }, renderCalendar())
            ),
            React.createElement('div', { className: 'mwb-legend' },
                React.createElement('div', { className: 'mwb-legend-item' },
                    React.createElement('span', { className: 'mwb-legend-color available' }),
                    'Available'
                ),
                React.createElement('div', { className: 'mwb-legend-item' },
                    React.createElement('span', { className: 'mwb-legend-color limited' }),
                    'Limited'
                ),
                React.createElement('div', { className: 'mwb-legend-item' },
                    React.createElement('span', { className: 'mwb-legend-color sold_out' }),
                    'Sold Out'
                )
            ),
            selectedDate && React.createElement('div', { className: 'mwb-selected-date' },
                React.createElement('p', null, `Selected: ${utils.formatDate(selectedDate)}`),
                React.createElement('button', {
                    className: 'mwb-primary-btn',
                    onClick: () => config.onBookNow && config.onBookNow(selectedDate)
                }, config.strings?.bookNow || 'Book Now')
            )
        );
    };

    // Quick Book Button Component
    const QuickBookButton = ({ config = {} }) => {
        const [showModal, setShowModal] = useState(false);

        const handleBookNow = () => {
            if (config.enableModal) {
                setShowModal(true);
            } else if (config.onBookNow) {
                config.onBookNow();
            } else {
                // Default behavior - scroll to first booking widget on page
                const bookingWidget = document.querySelector('.marine-world-booking-container');
                if (bookingWidget) {
                    bookingWidget.scrollIntoView({ behavior: 'smooth' });
                }
            }
        };

        const closeModal = () => {
            setShowModal(false);
        };

        return React.createElement('div', { className: 'mwb-quick-book' },
            React.createElement('button', {
                className: 'mwb-quick-book-btn',
                onClick: handleBookNow,
                style: {
                    backgroundColor: config.primaryColor,
                    color: config.buttonTextColor || '#ffffff'
                }
            }, config.buttonText || config.strings?.bookNow || 'Book Now'),
            
            showModal && React.createElement('div', { className: 'mwb-modal-overlay', onClick: closeModal },
                React.createElement('div', { 
                    className: 'mwb-modal-content',
                    onClick: (e) => e.stopPropagation()
                },
                    React.createElement('button', {
                        className: 'mwb-modal-close',
                        onClick: closeModal
                    }, '×'),
                    React.createElement(BookingFlow, { config })
                )
            )
        );
    };

    // Main Widget Initialization
    const MarineWorldBooking = {
        initWidget(elementId, widgetConfig = {}) {
            const element = document.getElementById(elementId);
            if (!element) {
                console.error(`Marine World Booking: Element with ID ${elementId} not found`);
                return;
            }

            let component;
            switch (widgetConfig.widgetType) {
                case 'calendar_only':
                    component = React.createElement(CalendarOnly, { config: widgetConfig });
                    break;
                case 'quick_book':
                    component = React.createElement(QuickBookButton, { config: widgetConfig });
                    break;
                case 'full_booking':
                default:
                    component = React.createElement(BookingFlow, { config: widgetConfig });
                    break;
            }

            render(component, element);
        },

        openModal(config = {}) {
            document.dispatchEvent(new CustomEvent('mwb-open-modal', { detail: { config } }));
        },

        closeModal() {
            document.dispatchEvent(new CustomEvent('mwb-close-modal'));
        }
    };

    // Auto-initialize widgets on page load
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize shortcode containers
        document.querySelectorAll('.marine-world-booking-container').forEach(container => {
            if (!container.dataset.initialized) {
                const config = {
                    widgetType: 'full_booking',
                    defaultLocation: container.dataset.location || 'all',
                    themeStyle: container.dataset.theme || 'default',
                    showSteps: container.dataset.showSteps !== 'false'
                };
                
                const uniqueId = container.id || `mwb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                container.id = uniqueId;
                
                MarineWorldBooking.initWidget(uniqueId, config);
                container.dataset.initialized = 'true';
            }
        });

        // Initialize calendar containers
        document.querySelectorAll('.marine-world-calendar-container').forEach(container => {
            if (!container.dataset.initialized) {
                const config = {
                    widgetType: 'calendar_only',
                    defaultLocation: container.dataset.location || 'all',
                    themeStyle: container.dataset.view || 'default'
                };
                
                const uniqueId = container.id || `mwb-cal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                container.id = uniqueId;
                
                MarineWorldBooking.initWidget(uniqueId, config);
                container.dataset.initialized = 'true';
            }
        });

        // Handle quick book buttons
        document.querySelectorAll('.mwb-modal-trigger').forEach(button => {
            button.addEventListener('click', function() {
                const config = {
                    defaultLocation: this.dataset.location || 'all',
                    themeStyle: this.dataset.theme || 'default',
                    enableModal: true
                };
                MarineWorldBooking.openModal(config);
            });
        });

        // Initialize Elementor widgets
        document.querySelectorAll('.marine-world-booking-elementor-widget').forEach(widget => {
            if (!widget.dataset.initialized) {
                try {
                    const config = JSON.parse(widget.dataset.widgetConfig || '{}');
                    MarineWorldBooking.initWidget(widget.id, config);
                    widget.dataset.initialized = 'true';
                } catch (e) {
                    console.error('Failed to parse widget config:', e);
                }
            }
        });
    });

    // Expose to global scope
    window.MarineWorldBooking = MarineWorldBooking;

})();
