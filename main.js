// ================================================
// MAIN.JS - FULL LUXURY UI INTEGRATION (UPDATED)
// ================================================

import { CONFIG } from './config.js';

// ============= PRELOADER =============

function hidePreloader() {
    const preloader = document.getElementById('preloader');
    const image = document.getElementById('preloader-image');
    
    if (image) {
        // Slide image up
        image.classList.add('slide-up');
    }
    
    // Remove preloader completely after animation completes
    setTimeout(() => {
        if (preloader) {
            preloader.classList.add('hide');
            // Remove from DOM completely
            setTimeout(() => {
                if (preloader.parentNode) {
                    preloader.remove();
                }
            }, 100);
        }
    }, 800); // Wait for slide animation to complete
}

// Auto-hide after 2 seconds
setTimeout(hidePreloader, 2000);

// Also hide on page load (whichever comes first)
window.addEventListener('load', function() {
    setTimeout(hidePreloader, 300);
});

// Fallback: hide after 3.5 seconds max
setTimeout(hidePreloader, 3500);

// ============= STATE =============
let listings = [];
let offplan = [];
let communities = [];
let currentSection = 'home';
let config = { ...CONFIG };
let agentProfile = {};
let currentListingId = null;
let isRTL = false;

// ============= API BASE URL =============
const API_BASE = CONFIG.workerURL || 'https://ranabullah01.ranabullah01.workers.dev';

// ============= TOAST NOTIFICATION =============
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return alert(message);
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fadeout');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============= LOAD DATA FROM API =============

async function loadAllData() {
    // Show skeleton loaders immediately
    const listingsContainer = document.getElementById('listings-grid');
    const featuredContainer = document.getElementById('featured-listings');
    if (listingsContainer) listingsContainer.innerHTML = createSkeletons(3);
    if (featuredContainer) featuredContainer.innerHTML = createSkeletons(3);
    
    try {
        const profileResponse = await fetch(`${API_BASE}/api/agent-profile?t=${Date.now()}`);
        const profileData = await profileResponse.json();
        if (profileData.success) {
            agentProfile = profileData.profile;
            Object.assign(config, agentProfile);
        }
        
        const listingsResponse = await fetch(`${API_BASE}/api/listings?t=${Date.now()}`);
        const listingsData = await listingsResponse.json();
        if (listingsData.success) {
            listings = listingsData.listings;
        }
        
        const offplanResponse = await fetch(`${API_BASE}/api/offplan?t=${Date.now()}`);
        const offplanData = await offplanResponse.json();
        if (offplanData.success) {
            offplan = offplanData.projects;
        }
        
        const communitiesResponse = await fetch(`${API_BASE}/api/communities?t=${Date.now()}`);
        const communitiesData = await communitiesResponse.json();
        if (communitiesData.success) {
            communities = communitiesData.communities;
        }
        
        updateAllSections();
        
    } catch (error) {
        console.error('Error loading data from API:', error);
        loadFromLocalStorage();
    }
}

function loadFromLocalStorage() {
    try {
        listings = JSON.parse(localStorage.getItem('ak_listings') || '[]');
        offplan = JSON.parse(localStorage.getItem('ak_offplan') || '[]');
        communities = JSON.parse(localStorage.getItem('ak_communities') || '[]');
        Object.assign(config, JSON.parse(localStorage.getItem('ak_config') || '{}'));
        updateAllSections();
    } catch (e) {
        console.error('Error loading from localStorage:', e);
    }
}

// Helper function to create skeleton loaders
function createSkeletons(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="skeleton-card">
                <div class="skeleton-img"></div>
                <div class="skeleton-body">
                    <div class="skeleton-line long"></div>
                    <div class="skeleton-line short"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line" style="width: 80%; margin-bottom: 0;"></div>
                </div>
            </div>
        `;
    }
    return html;
}

// ============= UPDATE ALL SECTIONS =============

function updateAllSections() {
    updateConfigInDOM();
    renderFeaturedListings();
    renderFeaturedOffplan();
    renderHomeCommunities();
    renderListingsPage();
    renderOffplanPage();
    renderCommunitiesPage();
    renderAboutPage();
    populateCommunityFilter();
}

// ============= CONFIG FUNCTIONS =============

function updateConfigInDOM() {
    const profile = agentProfile || config;
    
    document.querySelectorAll('#agent-name-home, #agent-name-about').forEach(el => {
        if (el) el.textContent = profile.agentName || config.agentName || 'Ahmed Khan';
    });
    
    const titleEl = document.getElementById('agent-tagline');
    if (titleEl) titleEl.textContent = profile.agentTitle || config.agentTitle || 'Luxury Real Estate Specialist';
    
    document.querySelectorAll('#rerna-number, #rerna-number-about, #footer-rerna').forEach(el => {
        if (el) el.textContent = profile.rernaBRN || config.rernaBRN || '123456';
    });
    
    document.querySelectorAll('#agent-bio-home, #agent-full-bio').forEach(el => {
        if (el) el.textContent = profile.bio || config.bio || '';
    });
    
    const statIds = ['years-exp', 'properties-sold', 'happy-clients', 'years-exp-about', 'properties-sold-about', 'happy-clients-about'];
    statIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id.includes('years')) el.textContent = profile.experience || config.experience || '12';
            else if (id.includes('properties')) el.textContent = '850';
            else if (id.includes('happy')) el.textContent = '1200';
        }
    });
    
    const specialtiesList = document.getElementById('specialties-list');
    if (specialtiesList) {
        specialtiesList.innerHTML = '';
        (profile.specialties || config.specialties || '').split(',').forEach(s => {
            if (s.trim()) {
                const tag = document.createElement('span');
                tag.className = 'specialty-tag';
                tag.textContent = s.trim();
                specialtiesList.appendChild(tag);
            }
        });
    }
    
    const languagesList = document.getElementById('languages-list');
    if (languagesList) {
        languagesList.innerHTML = '';
        (profile.languages || config.languages || '').split(',').forEach(l => {
            if (l.trim()) {
                const tag = document.createElement('span');
                tag.className = 'language-tag';
                tag.textContent = l.trim();
                languagesList.appendChild(tag);
            }
        });
    }
    
    const photo = profile.photo || config.photo || 'https://via.placeholder.com/400x400/0A1628/C9A84C?text=Agent';
    document.querySelectorAll('#agent-photo-home, #agent-photo-about').forEach(el => {
        if (el) el.src = photo;
    });
    
    const address = profile.address || config.address || 'Dubai, UAE';
    const phone = profile.phone || config.phone || '+971501234567';
    const email = profile.email || config.email || 'info@akwebservices.com';
    const whatsapp = profile.whatsapp || config.whatsapp || '+971501234567';
    
    document.getElementById('office-address').textContent = address;
    document.getElementById('office-phone').textContent = phone;
    document.getElementById('office-email').textContent = email;
    document.getElementById('office-whatsapp').textContent = whatsapp;
    document.getElementById('footer-address').textContent = address;
    document.getElementById('footer-phone').textContent = phone;
    document.getElementById('footer-email').textContent = email;
    document.getElementById('footer-whatsapp').href = `https://wa.me/${whatsapp}`;
    document.getElementById('footer-year').textContent = new Date().getFullYear();
    
    document.querySelectorAll('.portal-btn.propertyfinder').forEach(el => el.href = profile.propertyFinderURL || config.propertyFinderURL || '#');
    document.querySelectorAll('.portal-btn.bayut').forEach(el => el.href = profile.bayutURL || config.bayutURL || '#');
    
    const social = profile.social || config.social || {};
    const socialKeys = ['facebook', 'instagram', 'linkedin', 'youtube'];
    document.querySelectorAll('.social-links a').forEach((link, index) => {
        if (index < socialKeys.length) {
            const key = socialKeys[index];
            link.href = social[key] || config.social?.[key] || '#';
        }
    });
    
    const greeting = profile.whatsappGreeting || config.whatsappGreeting || 'Hello! I\'m interested in your real estate services.';
    const cleanNumber = whatsapp.replace(/[^0-9]/g, '');
    
    document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
        if (link.href) {
            link.href = link.href.replace(/wa\.me\/\d+/, `wa.me/${cleanNumber}`);
            if (link.href.includes('text=')) {
               link.href = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(greeting)}`;
            }
        }
    });
    
    const floatBtn = document.querySelector('.float-whatsapp');
    if (floatBtn) {
        floatBtn.href = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(greeting)}`;
    }
    
    document.title = profile.siteName || config.siteName || 'AK Web Services - Luxury Real Estate Dubai';
}

// ============= RENDER FUNCTIONS =============

function renderFeaturedListings() {
    const container = document.getElementById('featured-listings');
    if (!container) return;
    
    const featured = listings.filter(l => l.featured).slice(0, 3);
    container.innerHTML = '';
    
    if (featured.length === 0) {
        container.innerHTML = '<p class="no-results">No featured properties found.</p>';
        return;
    }
    
    featured.forEach(listing => {
        container.appendChild(createListingCard(listing));
    });
}

function renderListingsPage() {
    const container = document.getElementById('listings-grid');
    if (!container) return;
    renderListings(listings, container);
}

function renderListings(listingsData, container) {
    container.innerHTML = '';
    
    if (listingsData.length === 0) {
        container.innerHTML = '<p class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--dark-grey);">No properties found matching your criteria.</p>';
        return;
    }
    
    listingsData.forEach(listing => {
        container.appendChild(createListingCard(listing));
    });
}

function createListingCard(listing) {
    const card = document.createElement('div');
    card.className = 'listing-card';
    
    const images = listing.images && typeof listing.images === 'string' 
        ? listing.images.split(',') 
        : (Array.isArray(listing.images) ? listing.images : []);
    const firstImage = images.length > 0 ? images[0] : 'https://via.placeholder.com/800x600/0A1628/C9A84C?text=Property';
    
    card.innerHTML = `
        <div class="listing-card-image">
            <img src="${firstImage}" alt="${listing.title}" loading="lazy">
            <div class="listing-card-badges">
                ${listing.featured ? '<span class="badge badge-featured">Featured</span>' : ''}
                <span class="badge badge-status">${listing.status.replace('-', ' ')}</span>
                <span class="badge badge-type">${listing.type}</span>
            </div>
        </div>
        <div class="listing-card-body">
            <h3>${listing.title}</h3>
            <div class="listing-card-price">AED ${formatPrice(listing.price)}</div>
            <div class="listing-card-details">
                <span><i class="fas fa-map-marker-alt"></i> ${listing.community}</span>
                <span><i class="fas fa-bed"></i> ${listing.bedrooms} bed</span>
                <span><i class="fas fa-bath"></i> ${listing.bathrooms} bath</span>
                <span><i class="fas fa-ruler-combined"></i> ${listing.sqft} sqft</span>
            </div>
            <div class="listing-card-actions">
                <button class="btn btn-secondary btn-sm" onclick="window.viewListing('${listing.id}')">View Details</button>
                <a href="https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(listing.whatsappText || 'I\'m interested in this property')}" target="_blank" class="btn btn-whatsapp btn-sm">WhatsApp</a>
            </div>
        </div>
    `;
    return card;
}

function getWhatsAppNumber() {
    const number = config.whatsapp || '+971501234567';
    return number.replace(/[^0-9]/g, '');
}

function renderFeaturedOffplan() {
    const container = document.getElementById('featured-offplan');
    if (!container) return;
    
    const featured = offplan.filter(p => p.featured).slice(0, 2);
    container.innerHTML = '';
    
    if (featured.length === 0) {
        container.innerHTML = '<p class="no-results">No featured off-plan projects found.</p>';
        return;
    }
    
    featured.forEach(project => {
        container.appendChild(createOffplanCard(project));
    });
}

function renderOffplanPage() {
    const container = document.getElementById('offplan-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (offplan.length === 0) {
        container.innerHTML = '<p class="no-results">No off-plan projects found.</p>';
        return;
    }
    
    offplan.forEach(project => {
        container.appendChild(createOffplanCard(project));
    });
}

function createOffplanCard(project) {
    const card = document.createElement('div');
    card.className = 'offplan-card';
    
    const types = project.types && typeof project.types === 'string' 
        ? project.types.split(',') 
        : (Array.isArray(project.types) ? project.types : []);
    
    card.innerHTML = `
        <div class="offplan-card-image">
            <img src="${project.image || 'https://via.placeholder.com/800x600/0A1628/C9A84C?text=Off-Plan'}" alt="${project.projectName}" loading="lazy">
        </div>
        <div class="offplan-card-body">
            <h3>${project.projectName}</h3>
            <div class="offplan-card-developer">${project.developer}</div>
            <div class="offplan-card-price">From AED ${formatPrice(project.startingPrice)}</div>
            <div class="offplan-card-details">
                ${project.community} | ${project.handoverDate} | ${types.join(', ')}
                ${project.goldenVisaEligible ? ' | 🏆 Golden Visa' : ''}
            </div>
            <div class="offplan-card-actions">
                <a href="https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(project.brochureWhatsApp || 'I\'m interested in this off-plan project')}" target="_blank" class="btn btn-whatsapp btn-sm">Register Interest</a>
            </div>
        </div>
    `;
    return card;
}

function renderHomeCommunities() {
    const container = document.getElementById('home-communities');
    if (!container) return;
    renderCommunities(communities.slice(0, 4), container);
}

function renderCommunitiesPage() {
    const container = document.getElementById('communities-grid');
    if (!container) return;
    renderCommunities(communities, container);
}

function renderCommunities(communitiesData, container) {
    container.innerHTML = '';
    
    if (communitiesData.length === 0) {
        container.innerHTML = '<p class="no-results">No communities found.</p>';
        return;
    }
    
    communitiesData.forEach(community => {
        const card = document.createElement('div');
        card.className = 'community-card';
        
        const highlights = community.highlights && typeof community.highlights === 'string'
            ? community.highlights.split(',')
            : (Array.isArray(community.highlights) ? community.highlights : []);
        
        card.innerHTML = `
            <h3>${community.name}</h3>
            <div class="community-type">${community.communityType} ${community.popular ? '⭐ Popular' : ''}</div>
            <div class="community-prices">
                ${community.avgApartmentPrice && community.avgApartmentPrice !== 'N/A' ? `<span>Apartments: <strong>${community.avgApartmentPrice}</strong></span>` : ''}
                ${community.avgVillaPrice && community.avgVillaPrice !== 'N/A' ? `<span>Villas: <strong>${community.avgVillaPrice}</strong></span>` : ''}
                <span>Yield: <strong>${community.avgRentalYield}</strong></span>
            </div>
            <div class="community-highlights">
                ${highlights.slice(0, 3).map(h => `<span class="highlight-tag">${h.trim()}</span>`).join('')}
            </div>
            <div class="community-actions">
                <a href="#listings" class="btn btn-secondary btn-sm" onclick="window.filterByCommunity('${community.name}')">View Properties</a>
                <a href="https://wa.me/${getWhatsAppNumber()}?text=I'm%20interested%20in%20${encodeURIComponent(community.name)}" target="_blank" class="btn btn-whatsapp btn-sm">Ask About</a>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderAboutPage() {
    const testimonialsContainer = document.getElementById('testimonials-grid');
    if (testimonialsContainer) {
        const testimonials = [
            { name: 'Sarah Johnson', detail: 'Property Investor, UK', quote: 'Ahmed helped me find the perfect investment property in Dubai. His knowledge of off-plan projects and market trends is exceptional.' },
            { name: 'Michael Chen', detail: 'Business Owner, Singapore', quote: 'Professional, responsive, and truly understands luxury real estate. Made our property purchase seamless.' },
            { name: 'Emma Williams', detail: 'Expat, Australia', quote: 'From our first meeting to property handover, Ahmed provided outstanding service. Highly recommend for anyone buying in Dubai.' }
        ];
        
        testimonialsContainer.innerHTML = '';
        testimonials.forEach(t => {
            const card = document.createElement('div');
            card.className = 'testimonial-card';
            card.innerHTML = `
                <div class="quote">"${t.quote}"</div>
                <div class="client">${t.name}</div>
                <div class="client-detail">${t.detail}</div>
            `;
            testimonialsContainer.appendChild(card);
        });
    }
    
    const salesContainer = document.getElementById('sales-grid');
    if (salesContainer) {
        const sales = [
            { title: 'Luxury Penthouse', community: 'Downtown Dubai', price: 'AED 12,500,000' },
            { title: 'Beachfront Villa', community: 'Palm Jumeirah', price: 'AED 25,000,000' },
            { title: 'Sky View Apartment', community: 'Dubai Marina', price: 'AED 3,800,000' }
        ];
        
        salesContainer.innerHTML = '';
        sales.forEach(sale => {
            const card = document.createElement('div');
            card.className = 'sale-card';
            card.innerHTML = `
                <div class="sale-price">${sale.price}</div>
                <div class="sale-title">${sale.title}</div>
                <div class="sale-detail">${sale.community}</div>
            `;
            salesContainer.appendChild(card);
        });
    }
}

// ============= FILTER FUNCTIONS =============

function filterListings() {
    const type = document.getElementById('filter-type')?.value || 'all';
    const bedrooms = document.getElementById('filter-bedrooms')?.value || 'all';
    const price = document.getElementById('filter-price')?.value || 'all';
    const community = document.getElementById('filter-community')?.value || 'all';
    const status = document.getElementById('filter-status')?.value || 'all';
    const search = document.getElementById('filter-search')?.value?.toLowerCase() || '';
    
    let filtered = [...listings];
    
    if (type !== 'all') filtered = filtered.filter(l => l.type === type);
    if (bedrooms !== 'all') {
        const b = parseInt(bedrooms);
        filtered = filtered.filter(l => l.bedrooms >= b);
    }
    if (price !== 'all') {
        const p = price;
        if (p === '500k') filtered = filtered.filter(l => l.price < 500000);
        else if (p === '1m') filtered = filtered.filter(l => l.price >= 500000 && l.price < 1000000);
        else if (p === '2m') filtered = filtered.filter(l => l.price >= 1000000 && l.price < 2000000);
        else if (p === '5m') filtered = filtered.filter(l => l.price >= 2000000 && l.price < 5000000);
        else if (p === '10m') filtered = filtered.filter(l => l.price >= 5000000 && l.price < 10000000);
        else if (p === '10m+') filtered = filtered.filter(l => l.price >= 10000000);
    }
    if (community !== 'all') filtered = filtered.filter(l => l.community === community);
    if (status !== 'all') filtered = filtered.filter(l => l.status === status);
    if (search) {
        filtered = filtered.filter(l => 
            l.title.toLowerCase().includes(search) ||
            l.community.toLowerCase().includes(search) ||
            (l.description && l.description.toLowerCase().includes(search))
        );
    }
    
    const container = document.getElementById('listings-grid');
    if (container) renderListings(filtered, container);
}

window.filterByCommunity = function(communityName) {
    navigateTo('listings');
    setTimeout(() => {
        const communitySelect = document.getElementById('filter-community');
        if (communitySelect) {
            communitySelect.value = communityName;
            filterListings();
        }
    }, 100);
};

function populateCommunityFilter() {
    // 1. Handle Listings Page Filter
    const filterSelect = document.getElementById('filter-community');
    if (filterSelect) {
        const currentValue = filterSelect.value;
        filterSelect.innerHTML = '<option value="all">All Communities</option>';
        communities.forEach(c => {
            const option = document.createElement('option');
            option.value = c.name;
            option.textContent = c.name;
            filterSelect.appendChild(option);
        });
        filterSelect.value = currentValue;
    }
    
    // 2. Handle Valuation Page Dropdown
    const valSelect = document.getElementById('val-community');
    if (valSelect) {
        const currentVal = valSelect.value;
        valSelect.innerHTML = '<option value="">Select Community</option>';
        communities.forEach(c => {
            const option = document.createElement('option');
            option.value = c.name;
            option.textContent = c.name;
            valSelect.appendChild(option);
        });
        valSelect.value = currentVal;
    }
}

// ============= VIEW LISTING DETAIL =============

window.viewListing = function(id) {
    const listing = listings.find(l => l.id === id);
    if (!listing) return;
    
    currentListingId = id;
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');
    
    modalTitle.textContent = listing.title;
    
    const images = listing.images && typeof listing.images === 'string' 
        ? listing.images.split(',') 
        : (Array.isArray(listing.images) ? listing.images : []);
    
    let gallery = '';
    if (images.length > 0) {
        gallery = `<div class="gallery" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:20px;">`;
        images.forEach(img => {
            gallery += `<img src="${img.trim()}" alt="${listing.title}" style="width:100%;height:200px;object-fit:cover;border-radius:8px;">`;
        });
        gallery += `</div>`;
    }
    
    const features = listing.features && typeof listing.features === 'string'
        ? listing.features.split(',')
        : (Array.isArray(listing.features) ? listing.features : []);
    
    modalBody.innerHTML = `
        <div class="listing-detail-modal">
            ${gallery}
            <div class="detail-info" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div><strong>Price:</strong> AED ${formatPrice(listing.price)}</div>
                <div><strong>Type:</strong> ${listing.type}</div>
                <div><strong>Status:</strong> ${listing.status.replace('-', ' ')}</div>
                <div><strong>Community:</strong> ${listing.community}</div>
                <div><strong>Bedrooms:</strong> ${listing.bedrooms}</div>
                <div><strong>Bathrooms:</strong> ${listing.bathrooms}</div>
                <div><strong>Size:</strong> ${listing.sqft} sqft</div>
                <div><strong>Floor:</strong> ${listing.floor || 'N/A'}</div>
                <div><strong>View:</strong> ${listing.view || 'N/A'}</div>
                <div><strong>Furnishing:</strong> ${listing.furnishing || 'N/A'}</div>
                <div><strong>Parking:</strong> ${listing.parking}</div>
                <div><strong>Permit:</strong> ${listing.permit || 'N/A'}</div>
            </div>
            <div style="margin-top:16px;">
                <p><strong>Description:</strong></p>
                <p>${listing.description}</p>
            </div>
            ${features.length > 0 ? `
                <div style="margin-top:12px;">
                    <p><strong>Features:</strong></p>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                        ${features.map(f => `<span style="background:var(--light-grey);padding:4px 12px;border-radius:4px;">${f.trim()}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap;">
                <a href="https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(listing.whatsappText || 'I\'m interested in this property')}" target="_blank" class="btn btn-whatsapp">Inquire on WhatsApp</a>
                <button class="btn btn-primary" onclick="window.scheduleViewing('${listing.title}')">Schedule Viewing</button>
                <button class="btn btn-secondary" onclick="window.closeModal()">Close</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
};

window.scheduleViewing = function(property) {
    closeModal();
    navigateTo('contact');
    setTimeout(() => {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-tab="viewing"]')?.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.getElementById('tab-viewing')?.classList.add('active');
        
        const propertyInput = document.getElementById('view-property');
        if (propertyInput) propertyInput.value = property;
    }, 100);
};

window.closeModal = function() {
    document.getElementById('modal').style.display = 'none';
};

// ============= ROI CALCULATOR =============

function calculateROI() {
    const price = parseFloat(document.getElementById('calc-price').value);
    const rent = parseFloat(document.getElementById('calc-rent').value);
    const service = parseFloat(document.getElementById('calc-service').value);
    
    if (!price || !rent) {
        showToast('Please enter property price and annual rent.', 'error');
        return;
    }
    
    const grossYield = (rent / price) * 100;
    const netRent = rent - service;
    const netYield = (netRent / price) * 100;
    const annualReturn = netRent;
    
    const results = document.getElementById('calc-results');
    results.innerHTML = `
        <div class="result-item"><span>Property Price</span><span class="value">AED ${formatPrice(price)}</span></div>
        <div class="result-item"><span>Annual Rent</span><span class="value">AED ${formatPrice(rent)}</span></div>
        <div class="result-item"><span>Service Charges</span><span class="value">AED ${formatPrice(service)}</span></div>
        <div class="result-item"><span>Gross Yield</span><span class="value">${grossYield.toFixed(2)}%</span></div>
        <div class="result-item"><span>Net Yield</span><span class="value">${netYield.toFixed(2)}%</span></div>
        <div class="result-item"><span>Annual Net Return</span><span class="value">AED ${formatPrice(annualReturn)}</span></div>
    `;
    results.classList.add('show');
}

// ============= FORM SUBMISSIONS =============

function submitForm(formId, endpoint, successMessage) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        data.site_id = 'akwebservices';
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.textContent : 'Submit';
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
        }
        
        try {
            const response = await fetch(`${API_BASE}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast(successMessage, 'success');
                form.reset();
            } else {
                showToast('There was an error submitting the form. Please try again or contact us directly.', 'error');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            showToast('Network error. Please check your connection.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        }
    });
}

// ============= UTILITY FUNCTIONS =============

function formatPrice(price) {
    if (!price) return '0';
    if (price >= 1000000) {
        return (price / 1000000).toFixed(1) + 'M';
    }
    return price.toLocaleString();
}

function formatDate(date) {
    if (!date) return 'N/A';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return 'N/A';
    }
}

// ============= SPA NAVIGATION =============

function navigateTo(sectionId) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.getElementById(sectionId)?.classList.add('active');
    
    document.querySelectorAll('.nav-menu a, .footer-links a').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.section === sectionId) el.classList.add('active');
    });
    
    currentSection = sectionId;
    
    const sectionNames = {
        home: config.siteName || 'AK Web Services - Luxury Real Estate Dubai',
        listings: 'Properties | ' + (config.siteName || 'AK Web Services'),
        offplan: 'Off-Plan Projects | ' + (config.siteName || 'AK Web Services'),
        communities: 'Communities | ' + (config.siteName || 'AK Web Services'),
        about: 'About | ' + (config.siteName || 'AK Web Services'),
        contact: 'Contact | ' + (config.siteName || 'AK Web Services'),
        valuation: 'Valuation | ' + (config.siteName || 'AK Web Services'),
        goldenvisa: 'Golden Visa | ' + (config.siteName || 'AK Web Services')
    };
    document.title = sectionNames[sectionId] || config.siteName || 'AK Web Services';
    
    if (sectionId === 'listings') {
        populateCommunityFilter();
        filterListings();
    } else if (sectionId === 'valuation') {
        populateCommunityFilter();
    } else if (sectionId === 'home') {
        renderFeaturedListings();
        renderFeaturedOffplan();
        renderHomeCommunities();
    } else if (sectionId === 'offplan') {
        renderOffplanPage();
    } else if (sectionId === 'communities') {
        renderCommunitiesPage();
    } else if (sectionId === 'about') {
        renderAboutPage();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============= MOBILE MENU =============

function toggleMobileMenu() {
    document.getElementById('nav-menu')?.classList.toggle('active');
    document.getElementById('hamburger')?.classList.toggle('active');
}

// ============= RTL TOGGLE =============

function toggleRTL() {
    isRTL = !isRTL;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    const langToggle = document.getElementById('langToggle');
    if (langToggle) langToggle.textContent = isRTL ? 'AR' : 'EN';
    localStorage.setItem('ak_rtl', isRTL ? 'true' : 'false');
}

// ============= FAQ ACCORDION =============

function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('active');
            const answer = this.nextElementSibling;
            if (answer) answer.classList.toggle('show');
        });
    });
}

// ============= INIT =============

document.addEventListener('DOMContentLoaded', function() {
    loadAllData();
    
    const rtlStored = localStorage.getItem('ak_rtl');
    if (rtlStored === 'true') {
        isRTL = true;
        document.documentElement.dir = 'rtl';
        const langToggle = document.getElementById('langToggle');
        if (langToggle) langToggle.textContent = 'AR';
    }
    
    document.querySelectorAll('[data-section]').forEach(el => {
        el.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            if (section) {
                navigateTo(section);
                document.getElementById('nav-menu')?.classList.remove('active');
                document.getElementById('hamburger')?.classList.remove('active');
            }
        });
    });
    
    document.getElementById('hamburger')?.addEventListener('click', toggleMobileMenu);
    document.getElementById('langToggle')?.addEventListener('click', toggleRTL);
    document.getElementById('calc-roi-btn')?.addEventListener('click', calculateROI);
    
    document.querySelectorAll('#calc-price, #calc-rent, #calc-service').forEach(input => {
        input.addEventListener('keypress', function(e) { if (e.key === 'Enter') calculateROI(); });
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.getElementById(`tab-${tab}`)?.classList.add('active');
        });
    });
    
    initFAQ();
    
    submitForm('inquiry-form', 'leads/contact', 'Thank you! Your inquiry has been sent. We will respond within 24 hours.');
    submitForm('viewing-form', 'leads/viewing', 'Thank you! Your viewing request has been submitted. We will confirm the time shortly.');
    submitForm('valuation-form', 'leads/valuation', 'Thank you! Your valuation request has been submitted. We will get back to you within 24 hours.');
    submitForm('goldenvisa-form', 'leads/goldenvisa', 'Thank you! Your Golden Visa consultation request has been submitted. We will contact you shortly.');
    
    document.querySelectorAll('.filter-bar select, .filter-bar input').forEach(el => {
        el.addEventListener('change', filterListings);
        el.addEventListener('keyup', function(e) { if (e.key === 'Enter') filterListings(); });
    });
    
    document.getElementById('modal-close')?.addEventListener('click', () => document.getElementById('modal').style.display = 'none');
    document.getElementById('modal-cancel')?.addEventListener('click', () => document.getElementById('modal').style.display = 'none');
    window.addEventListener('click', function(e) { if (e.target === document.getElementById('modal')) document.getElementById('modal').style.display = 'none'; });
    
    navigateTo('home');

    // ================================================
    // HEADER SCROLL EFFECT (Transparent to Navy)
    // ================================================
    const header = document.getElementById('main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
});

// ============= EXPOSE FOR GLOBAL USE =============
window.listings = listings;
window.offplan = offplan;
window.communities = communities;
window.config = config;
window.agentProfile = agentProfile;
window.loadAllData = loadAllData;
window.formatPrice = formatPrice;
window.filterListings = filterListings;
window.filterByCommunity = filterByCommunity;
window.navigateTo = navigateTo;
window.viewListing = window.viewListing;
window.scheduleViewing = window.scheduleViewing;
window.closeModal = window.closeModal;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleRTL = toggleRTL;
window.CONFIG = CONFIG;
