// ================================================
// MAIN.JS - FULL LUXURY UI INTEGRATION (WITH BLOG & LISTING PAGES)
// ================================================

import { CONFIG } from './config.js';

// ============= PRELOADER =============

function hidePreloader() {
    const preloader = document.getElementById('preloader');
    const image = document.getElementById('preloader-image');
    
    if (image) {
        image.classList.add('slide-up');
    }
    
    setTimeout(() => {
        if (preloader) {
            preloader.classList.add('hide');
            setTimeout(() => {
                if (preloader.parentNode) {
                    preloader.remove();
                }
            }, 100);
        }
    }, 800);
}

setTimeout(hidePreloader, 2000);

window.addEventListener('load', function() {
    setTimeout(hidePreloader, 300);
});

setTimeout(hidePreloader, 3500);

// ============= STATE =============
let listings = [];
let offplan = [];
let communities = [];
let blogPosts = [];
let currentSection = 'home';
let config = { ...CONFIG };
let agentProfile = {};
let currentListingId = null;
let isRTL = false;
let currentBlogPost = null;

// ============= API BASE URL =============
const API_BASE = CONFIG.workerURL || 'https://ranabullah01.ranabullah01.workers.dev';

// ============= URL ROUTING =============
const BASE_PATH = (() => {
    if (location.hostname.endsWith('.github.io')) {
        const seg = location.pathname.split('/').filter(Boolean)[0];
        return seg ? '/' + seg : '';
    }
    return '';
})();

function buildPath(sectionId, slug) {
    const parts = [];
    if (BASE_PATH) parts.push(BASE_PATH.replace(/^\//, ''));
    if (sectionId && sectionId !== 'home') parts.push(sectionId);
    if (slug) parts.push(String(slug));
    const path = '/' + parts.join('/');
    return path.length > 1 ? path : '/';
}

function parseCurrentRoute() {
    let path = location.pathname;
    if (BASE_PATH && path.startsWith(BASE_PATH)) {
        path = path.slice(BASE_PATH.length);
    }
    const segments = path.split('/').filter(Boolean);
    const knownSections = ['listings', 'offplan', 'communities', 'about', 'contact', 'valuation', 'goldenvisa', 'blog'];
    if (segments.length === 0) return { section: 'home', slug: null };
    const section = knownSections.includes(segments[0]) ? segments[0] : 'home';
    const slug = segments[1] || null;
    return { section, slug };
}

function handleRoute() {
    const { section, slug } = parseCurrentRoute();
    if (section === 'blog' && slug) {
        navigateTo('blog', { push: false });
        window.viewBlogPost(slug, { push: false });
    } else if (section === 'listings' && slug) {
        navigateTo('listings', { push: false });
        const listing = listings.find(l => l.id == slug || String(l.id) === String(slug));
        const filterBar = document.getElementById('filter-bar');
        if (listing) {
            document.getElementById('listings-grid').style.display = 'none';
            document.getElementById('listing-detail').style.display = 'block';
            document.getElementById('listing-detail-content').innerHTML = renderListingDetail(listing);
            document.title = listing.title + ' | ' + (config.siteName || 'Agent Web Studio');
            if (filterBar) filterBar.style.display = 'none';
            setTimeout(initGallery, 100);
        } else {
            window.showListingList({ push: false });
        }
    } else if (section === 'listings') {
        window.showListingList({ push: false });
    } else {
        navigateTo(section, { push: false });
    }
}

function updateCanonical(path) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
    }
    link.setAttribute('href', location.origin + path);
}

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
        
        const blogResponse = await fetch(`${API_BASE}/api/blog?t=${Date.now()}`);
        const blogData = await blogResponse.json();
        if (blogData.success) {
            blogPosts = blogData.posts;
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
        blogPosts = JSON.parse(localStorage.getItem('ak_blog') || '[]');
        Object.assign(config, JSON.parse(localStorage.getItem('ak_config') || '{}'));
        updateAllSections();
    } catch (e) {
        console.error('Error loading from localStorage:', e);
    }
}

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
    renderBlogGrid();
    populateCommunityFilter();
    
    const { section, slug } = parseCurrentRoute();
    const filterBar = document.getElementById('filter-bar');
    if (section === 'listings' && slug) {
        const listing = listings.find(l => l.id == slug || String(l.id) === String(slug));
        if (listing) {
            document.getElementById('listings-grid').style.display = 'none';
            document.getElementById('listing-detail').style.display = 'block';
            document.getElementById('listing-detail-content').innerHTML = renderListingDetail(listing);
            document.title = listing.title + ' | ' + (config.siteName || 'Agent Web Studio');
            if (filterBar) filterBar.style.display = 'none';
            setTimeout(initGallery, 100);
        }
    } else if (section === 'listings') {
        if (filterBar) filterBar.style.display = 'grid';
    }
}

// ============= CONFIG FUNCTIONS =============

function updateConfigInDOM() {
    const profile = agentProfile || config;
    
    document.querySelectorAll('#agent-name-home, #agent-name-about').forEach(el => {
        if (el) el.textContent = profile.agentName || config.agentName || 'Ahmed Khan';
    });
    
    const titleEl = document.getElementById('agent-tagline');
    if (titleEl && !titleEl.dataset.custom) {
        titleEl.textContent = profile.agentTitle || config.agentTitle || 'Luxury Real Estate Specialist';
    }
    
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
    
    const photo = profile.photo || config.photo || 'https://placehold.co/400x400/0A1628/C9A84C?text=Agent';
    document.querySelectorAll('#agent-photo-home, #agent-photo-about').forEach(el => {
        if (el) el.src = photo;
    });
    
    const address = profile.address || config.address || 'Dubai, UAE';
    const phone = profile.phone || config.phone || '+971501234567';
    const email = profile.email || config.email || 'info@agentwebstudio.com';
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
    
    document.title = profile.siteName || config.siteName || 'Agent Web Studio - Luxury Real Estate Dubai';
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
    const firstImage = images.length > 0 ? images[0] : 'https://placehold.co/800x600/0A1628/C9A84C?text=Property';
    
    card.innerHTML = `
        <div class="listing-card-image">
            <img src="${firstImage}" alt="${listing.title}" loading="lazy">
            <div class="listing-card-badges">
                ${listing.featured ? '<span class="badge badge-featured"><i class="fas fa-star"></i> FEATURED</span>' : ''}
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
                <button class="btn btn-secondary btn-sm" onclick="window.viewListingPage('${listing.id}')">View Details</button>
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

// ============= VIEW LISTING DETAIL (PAGE) - HIDE FILTER BAR =============

window.viewListingPage = function(id, opts = {}) {
    const { push = true } = opts;
    const listing = listings.find(l => l.id == id || String(l.id) === String(id));
    if (!listing) {
        showToast('Listing not found.', 'error');
        return;
    }

    const grid = document.getElementById('listings-grid');
    const detailContainer = document.getElementById('listing-detail');
    const content = document.getElementById('listing-detail-content');
    const filterBar = document.getElementById('filter-bar');
    
    if (grid) grid.style.display = 'none';
    if (filterBar) filterBar.style.display = 'none';
    if (detailContainer) {
        detailContainer.style.display = 'block';
        if (content) {
            content.innerHTML = renderListingDetail(listing);
            setTimeout(initGallery, 100);
        }
    }

    if (push) {
        const path = buildPath('listings', listing.id);
        if (location.pathname !== path) {
            history.pushState({ section: 'listings', slug: listing.id }, '', path);
        }
        updateCanonical(path);
    }
    
    document.title = listing.title + ' | ' + (config.siteName || 'Agent Web Studio');
    
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    const listingsSection = document.getElementById('listings');
    if (listingsSection) listingsSection.classList.add('active');
    
    document.querySelectorAll('.nav-menu a, .footer-links a, .floating-nav a, [data-section]').forEach(el => {
        el.classList.remove('active');
        if (el.dataset && el.dataset.section === 'listings') {
            el.classList.add('active');
        }
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.showListingList = function(opts = {}) {
    const { push = true } = opts;
    const grid = document.getElementById('listings-grid');
    const detail = document.getElementById('listing-detail');
    const content = document.getElementById('listing-detail-content');
    const filterBar = document.getElementById('filter-bar');
    
    if (grid) grid.style.display = 'grid';
    if (filterBar) filterBar.style.display = 'grid';
    if (detail) detail.style.display = 'none';
    if (content) content.innerHTML = '';
    
    if (push) {
        const path = buildPath('listings');
        if (location.pathname !== path) {
            history.pushState({ section: 'listings', slug: null }, '', path);
        }
        updateCanonical(path);
    }
    document.title = 'Properties | ' + (config.siteName || 'Agent Web Studio');
    
    navigateTo('listings', { push: false });
};

// ============================================================
// RENDER LISTING DETAIL - REFINED 2-COLUMN LAYOUT
// Gallery: 16:9 with 4 thumbs + "more" card
// Price + status inline, quick stats card, improved symmetry
// TOP BAR: Back button + Breadcrumb aligned on same baseline
// TRUST BADGES: full-width card with centered icons & text
// ============================================================

function renderListingDetail(listing) {
    const images = listing.images && typeof listing.images === 'string'
        ? listing.images.split(',').map(img => img.trim()).filter(img => img)
        : (Array.isArray(listing.images) ? listing.images : []);

    if (images.length === 0) {
        images.push('https://placehold.co/1200x675/0A1628/C9A84C?text=No+Image');
    }

    const features = listing.features && typeof listing.features === 'string'
        ? listing.features.split(',').map(f => f.trim()).filter(f => f)
        : (Array.isArray(listing.features) ? listing.features : []);

    const statusClass = listing.status || 'for-sale';
    const statusLabel = listing.status ? listing.status.replace('-', ' ').toUpperCase() : 'FOR SALE';

    // ---------- GALLERY (16:9) ----------
    const gallery = `
        <div class="listing-detail-gallery" id="listing-gallery">
            <div class="gallery-main" id="gallery-main">
                <img src="${images[0]}" alt="${listing.title}" id="gallery-main-image" onerror="this.src='https://placehold.co/1200x675/0A1628/C9A84C?text=No+Image'">
                <div class="gallery-controls">
                    <button class="prev-btn" id="gallery-prev" aria-label="Previous image">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="next-btn" id="gallery-next" aria-label="Next image">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="gallery-counter" id="gallery-counter">1 / ${images.length}</div>
            </div>
            <div class="gallery-thumbs" id="gallery-thumbs">
                ${images.slice(0, 4).map((img, index) => `
                    <img src="${img}" alt="${listing.title} - Image ${index + 1}"
                         class="thumb ${index === 0 ? 'active' : ''}"
                         data-index="${index}"
                         onclick="window.setGalleryImage(${index})"
                         onerror="this.src='https://placehold.co/100x100/0A1628/C9A84C?text=No+Image'">
                `).join('')}
                ${images.length > 4 ? `
                    <div class="thumb more-photos" onclick="window.openGallery()">
                        <span>+${images.length - 4} Photos</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    // ---------- PROPERTY DETAILS (used in left column on desktop, moved to right on mobile) ----------
    const details = [
        { label: 'Property Type', value: listing.type || 'N/A' },
        { label: 'Status', value: statusLabel },
        { label: 'Community', value: listing.community || 'N/A' },
        { label: 'Bedrooms', value: listing.bedrooms || 'N/A' },
        { label: 'Bathrooms', value: listing.bathrooms || 'N/A' },
        { label: 'Size', value: listing.sqft ? `${listing.sqft} sqft` : 'N/A' },
        { label: 'Floor', value: listing.floor || 'N/A' },
        { label: 'View', value: listing.view || 'N/A' },
        { label: 'Furnishing', value: listing.furnishing || 'N/A' },
        { label: 'Parking', value: listing.parking || 'N/A' }
    ];
    if (listing.permit) details.push({ label: 'Trakheesi Permit', value: listing.permit });
    if (listing.building) details.push({ label: 'Building', value: listing.building });

    const propertyDetailsHtml = `
        <div class="listing-detail-card property-details-card">
            <h3 class="listing-detail-card-title">Property Details</h3>
            <div class="listing-detail-details-grid">
                ${details.map(d => `
                    <div class="listing-detail-detail-item">
                        <span class="detail-label">${d.label}</span>
                        <span class="detail-value">${d.value}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Same details but for mobile (rendered in right column)
    const propertyDetailsMobileHtml = `
        <div class="property-details-card-mobile">
            <h3 class="listing-detail-card-title">Property Details</h3>
            <div class="listing-detail-details-grid">
                ${details.map(d => `
                    <div class="listing-detail-detail-item">
                        <span class="detail-label">${d.label}</span>
                        <span class="detail-value">${d.value}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // ---------- QUICK STATS CARD (horizontal blocks) ----------
    const quickStats = `
        <div class="quick-stats-card">
            <div class="quick-stat-block">
                <i class="fas fa-bed"></i>
                <span class="stat-value">${listing.bedrooms || 'N/A'}</span>
                <span class="stat-label">Beds</span>
            </div>
            <div class="quick-stat-block">
                <i class="fas fa-bath"></i>
                <span class="stat-value">${listing.bathrooms || 'N/A'}</span>
                <span class="stat-label">Baths</span>
            </div>
            <div class="quick-stat-block">
                <i class="fas fa-ruler-combined"></i>
                <span class="stat-value">${listing.sqft || 'N/A'}</span>
                <span class="stat-label">sqft</span>
            </div>
            <div class="quick-stat-block">
                <i class="fas fa-building"></i>
                <span class="stat-value">${listing.type || 'N/A'}</span>
                <span class="stat-label">Type</span>
            </div>
        </div>
    `;

    // ---------- CTA BUTTONS ----------
    const whatsappNumber = getWhatsAppNumber();
    const whatsappText = listing.whatsappText || "I'm interested in this property";

    const ctaHtml = `
        <div class="listing-detail-actions-card">
            <h4 class="action-title">Interested in this property?</h4>
            <p class="action-subtitle">Get more details or schedule a viewing</p>
            <div class="listing-detail-actions">
                <a href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}" target="_blank" class="btn btn-whatsapp">
                    <i class="fab fa-whatsapp"></i> Inquire on WhatsApp
                </a>
                <button class="btn btn-primary" onclick="window.scheduleViewing('${listing.title}')">
                    <i class="fas fa-calendar-check"></i> Schedule Viewing
                </button>
            </div>
        </div>
    `;

    // ---------- FULL HTML ----------
    return `
        <div class="listing-detail-page">
            <!-- TOP BAR: Back button + Breadcrumb -->
            <div class="listing-detail-top-bar">
                <button class="btn btn-secondary" onclick="window.showListingList()">
                    <i class="fas fa-arrow-left"></i> BACK TO PROPERTIES
                </button>
                <div class="breadcrumb-nav">
                    <a href="#" onclick="window.showListingList(); return false;">Home</a>
                    <span class="separator">/</span>
                    <a href="#" onclick="window.showListingList(); return false;">Properties</a>
                    <span class="separator">/</span>
                    <span class="current">${listing.community || 'Community'}</span>
                    <span class="separator">/</span>
                    <span class="current">${listing.title}</span>
                </div>
            </div>

            <!-- Main two-column layout -->
            <div class="listing-detail-container">
                <!-- LEFT COLUMN -->
                <div class="listing-detail-left-col">
                    ${gallery}
                    ${propertyDetailsHtml}
                </div>

                <!-- RIGHT COLUMN -->
                <div class="listing-detail-right-col">
                    <!-- Title -->
                    <h1 class="listing-detail-title">${listing.title}</h1>

                    <!-- Price + Status inline -->
                    <div class="price-status-row">
                        <span class="listing-detail-price">AED ${formatPrice(listing.price)}</span>
                        <span class="status-pill ${statusClass}">${statusLabel}</span>
                    </div>

                    <!-- Location line (community) -->
                    <div class="listing-detail-location">
                        <i class="fas fa-map-marker-alt"></i> ${listing.community || 'Dubai, UAE'}
                    </div>

                    <!-- Quick Stats Card -->
                    ${quickStats}

                    <!-- Description -->
                    ${listing.description ? `
                        <div class="listing-detail-card">
                            <h3 class="listing-detail-card-title">Description</h3>
                            <p class="listing-detail-description">${listing.description}</p>
                        </div>
                    ` : ''}

                    <!-- Features & Amenities -->
                    ${features.length > 0 ? `
                        <div class="listing-detail-card">
                            <h3 class="listing-detail-card-title">Features & Amenities</h3>
                            <div class="listing-detail-features-grid">
                                ${features.map(f => `
                                    <span class="listing-detail-feature-item">
                                        <i class="fas fa-check-circle"></i> ${f}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Property Details - Mobile version (hidden on desktop, shown on mobile after features) -->
                    ${propertyDetailsMobileHtml}

                    <!-- CTA Buttons -->
                    ${ctaHtml}
                </div>
            </div>

            <!-- FULL-WIDTH TRUST BADGES -->
            <div class="trust-badges-full">
                <div class="trust-badges-inner">
                    <div class="trust-item">
                        <i class="fas fa-shield-alt"></i>
                        <div>
                            <strong>Secure Investment</strong>
                            <span>RERA approved property with freehold ownership</span>
                        </div>
                    </div>
                    <div class="trust-item">
                        <i class="fas fa-chart-line"></i>
                        <div>
                            <strong>High ROI Potential</strong>
                            <span>Premium location with strong rental demand</span>
                        </div>
                    </div>
                    <div class="trust-item">
                        <i class="fas fa-headset"></i>
                        <div>
                            <strong>Full Support</strong>
                            <span>From purchase to property management</span>
                        </div>
                    </div>
                    <div class="trust-item">
                        <i class="fas fa-hand-holding-usd"></i>
                        <div>
                            <strong>Flexible Payment</strong>
                            <span>Multiple payment options available</span>
                        </div>
                    </div>
                    <div class="trust-item">
                        <i class="fas fa-percent"></i>
                        <div>
                            <strong>No Commission</strong>
                            <span>Direct from developer or owner</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============= GALLERY IMAGE SLIDER FUNCTIONS =============

let currentImageIndex = 0;
let galleryImages = [];

window.setGalleryImage = function(index) {
    const images = galleryImages;
    if (!images || images.length === 0) return;
    
    if (index < 0) index = images.length - 1;
    if (index >= images.length) index = 0;
    
    currentImageIndex = index;
    
    const mainImg = document.getElementById('gallery-main-image');
    if (mainImg) {
        mainImg.src = images[index];
        mainImg.alt = `Image ${index + 1}`;
    }
    
    const counter = document.getElementById('gallery-counter');
    if (counter) {
        counter.textContent = `${index + 1} / ${images.length}`;
    }
    
    document.querySelectorAll('.gallery-thumbs .thumb').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
};

window.prevImage = function() {
    window.setGalleryImage(currentImageIndex - 1);
};

window.nextImage = function() {
    window.setGalleryImage(currentImageIndex + 1);
};

function initGallery() {
    const thumbs = document.querySelectorAll('.gallery-thumbs .thumb');
    if (thumbs.length > 0) {
        galleryImages = Array.from(thumbs).map(thumb => thumb.src);
    } else {
        const mainImg = document.getElementById('gallery-main-image');
        if (mainImg) {
            galleryImages = [mainImg.src];
        }
    }
    
    currentImageIndex = 0;
    
    const counter = document.getElementById('gallery-counter');
    if (counter && galleryImages.length > 0) {
        counter.textContent = `1 / ${galleryImages.length}`;
    }
    
    const prevBtn = document.getElementById('gallery-prev');
    const nextBtn = document.getElementById('gallery-next');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            window.prevImage();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            window.nextImage();
        });
    }
    
    document.addEventListener('keydown', function(e) {
        const detailVisible = document.getElementById('listing-detail')?.style.display === 'block';
        if (!detailVisible) return;
        
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            window.prevImage();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            window.nextImage();
        }
    });
}

// ============= OPEN GALLERY (placeholder for "more photos") =============

window.openGallery = function() {
    showToast('Gallery view coming soon!', 'info');
};

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
            <img src="${project.image || 'https://placehold.co/800x600/0A1628/C9A84C?text=Off-Plan'}" alt="${project.projectName}" loading="lazy">
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
        
        const imageUrl = community.image || 'https://placehold.co/800x600/0A1628/C9A84C?text=Community';
        
        card.innerHTML = `
            <div class="community-card-image">
                <img src="${imageUrl}" alt="${community.name}" loading="lazy">
                ${community.popular ? '<span class="community-badge popular">⭐ Popular</span>' : ''}
            </div>
            <div class="community-card-body">
                <h3>${community.name}</h3>
                <div class="community-type">${community.communityType}</div>
                <div class="community-prices">
                    ${community.avgApartmentPrice && community.avgApartmentPrice !== 'N/A' ? `<span>Apartments: <strong>${community.avgApartmentPrice}</strong></span>` : ''}
                    ${community.avgVillaPrice && community.avgVillaPrice !== 'N/A' ? `<span>Villas: <strong>${community.avgVillaPrice}</strong></span>` : ''}
                    <span>Yield: <strong>${community.avgRentalYield}</strong></span>
                </div>
                ${community.lifestyle ? `<p class="community-lifestyle">${community.lifestyle}</p>` : ''}
                <div class="community-highlights">
                    ${highlights.slice(0, 3).map(h => `<span class="highlight-tag">${h.trim()}</span>`).join('')}
                </div>
                <div class="community-actions">
                    <a href="#listings" class="btn btn-secondary btn-sm" onclick="window.filterByCommunity('${community.name}')">View Properties</a>
                    <a href="https://wa.me/${getWhatsAppNumber()}?text=I'm%20interested%20in%20${encodeURIComponent(community.name)}" target="_blank" class="btn btn-whatsapp btn-sm">Ask About</a>
                </div>
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

// ============= BLOG FUNCTIONS =============

async function loadBlog() {
    try {
        const response = await fetch(`${API_BASE}/api/blog?t=${Date.now()}`);
        const data = await response.json();
        if (data.success) {
            blogPosts = data.posts;
            renderBlogGrid();
        }
    } catch (error) {
        console.error('Error loading blog:', error);
        const container = document.getElementById('blog-grid');
        if (container) {
            container.innerHTML = '<p class="no-results">Failed to load blog posts.</p>';
        }
    }
}

function renderBlogGrid() {
    const container = document.getElementById('blog-grid');
    if (!container) return;
    container.innerHTML = '';
    
    if (!blogPosts || blogPosts.length === 0) {
        container.innerHTML = '<p class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 40px;">No blog posts found. Check back soon!</p>';
        return;
    }
    
    blogPosts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'blog-card';
        
        const imageUrl = post.featured_image || 'https://placehold.co/800x400/0A1628/C9A84C?text=Blog';
        const tags = post.tags && typeof post.tags === 'string' ? post.tags.split(',') : (Array.isArray(post.tags) ? post.tags : []);
        
        card.innerHTML = `
            <div class="blog-card-image">
                <img src="${imageUrl}" alt="${post.title}" loading="lazy">
                ${post.featured ? '<span class="blog-badge featured">Featured</span>' : ''}
            </div>
            <div class="blog-card-body">
                <div class="blog-card-meta">
                    <span class="blog-category">${post.category || 'Uncategorized'}</span>
                    <span class="blog-date">${formatDate(post.published_at || post.created_at)}</span>
                </div>
                <h3 class="blog-card-title">${post.title}</h3>
                <p class="blog-card-excerpt">${post.excerpt || post.content.substring(0, 150) + '...'}</p>
                <div class="blog-card-footer">
                    <div class="blog-tags">
                        ${tags.slice(0, 3).map(tag => `<span class="blog-tag">${tag.trim()}</span>`).join('')}
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="window.viewBlogPost('${post.id}')">Read More</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

window.viewBlogPost = async function(idOrSlug, opts = {}) {
    const { push = true } = opts;
    const post = blogPosts.find(p => p.id == idOrSlug || p.slug === idOrSlug);
    if (!post) {
        showToast('Post not found.', 'error');
        return;
    }
    
    currentBlogPost = post;

    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.getElementById('blog')?.classList.add('active');
    document.querySelectorAll('.nav-menu a, .footer-links a').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.section === 'blog') el.classList.add('active');
    });
    currentSection = 'blog';
    
    document.getElementById('blog-grid').style.display = 'none';
    const detailContainer = document.getElementById('blog-detail');
    detailContainer.style.display = 'block';

    if (push) {
        const slugOrId = post.slug || post.id;
        const path = buildPath('blog', slugOrId);
        if (location.pathname !== path) {
            history.pushState({ section: 'blog', slug: slugOrId }, '', path);
        }
        updateCanonical(path);
    }
    document.title = post.title + ' | ' + (config.siteName || 'Agent Web Studio');
    
    const content = document.getElementById('blog-detail-content');
    const tags = post.tags && typeof post.tags === 'string' ? post.tags.split(',') : (Array.isArray(post.tags) ? post.tags : []);
    
    content.innerHTML = `
        <div class="blog-detail">
            ${post.featured_image ? `<div class="blog-detail-image"><img src="${post.featured_image}" alt="${post.title}"></div>` : ''}
            <div class="blog-detail-header">
                <div class="blog-detail-meta">
                    <span class="blog-category">${post.category || 'Uncategorized'}</span>
                    <span class="blog-date">${formatDate(post.published_at || post.created_at)}</span>
                    <span class="blog-author">By ${post.author || 'Admin'}</span>
                    <span class="blog-views">👁️ ${post.views || 0} views</span>
                </div>
                <h1 class="blog-detail-title">${post.title}</h1>
                ${post.excerpt ? `<p class="blog-detail-excerpt">${post.excerpt}</p>` : ''}
            </div>
            <div class="blog-detail-body">
                ${post.content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')}
            </div>
            ${tags.length > 0 ? `
                <div class="blog-detail-tags">
                    <h4>Tags</h4>
                    <div class="blog-tags">
                        ${tags.map(tag => `<span class="blog-tag">${tag.trim()}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            <div class="blog-detail-share">
                <h4>Share this post</h4>
                <div class="share-buttons">
                    <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}" target="_blank" class="share-btn twitter"><i class="fab fa-twitter"></i></a>
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank" class="share-btn facebook"><i class="fab fa-facebook-f"></i></a>
                    <a href="https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(post.title)}" target="_blank" class="share-btn linkedin"><i class="fab fa-linkedin-in"></i></a>
                    <a href="https://wa.me/?text=${encodeURIComponent(post.title + ' ' + window.location.href)}" target="_blank" class="share-btn whatsapp"><i class="fab fa-whatsapp"></i></a>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('blog').scrollIntoView({ behavior: 'smooth' });
};

window.showBlogList = function(opts = {}) {
    const { push = true } = opts;
    document.getElementById('blog-grid').style.display = 'grid';
    document.getElementById('blog-detail').style.display = 'none';
    currentBlogPost = null;
    document.title = 'Blog | ' + (config.siteName || 'Agent Web Studio');

    if (push) {
        const path = buildPath('blog');
        if (location.pathname !== path) {
            history.pushState({ section: 'blog', slug: null }, '', path);
        }
        updateCanonical(path);
    }
};

// ============= FILTER FUNCTIONS =============

function filterListings() {
    const type = document.getElementById('filter-type-listings')?.value || 'all';
    const bedrooms = document.getElementById('filter-bedrooms-listings')?.value || 'all';
    const price = document.getElementById('filter-price-listings')?.value || 'all';
    const community = document.getElementById('filter-community-listings')?.value || 'all';
    const status = document.getElementById('filter-status-listings')?.value || 'all';
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
    if (container) {
        renderListings(filtered, container);
    }
}

window.filterByCommunity = function(communityName) {
    navigateTo('listings');
    setTimeout(() => {
        const communitySelect = document.getElementById('filter-community-listings');
        if (communitySelect) {
            communitySelect.value = communityName;
            filterListings();
        }
    }, 100);
};

function populateCommunityFilter() {
    const filterSelect = document.getElementById('filter-community-listings');
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

    const heroCommunitySelect = document.getElementById('filter-community-hero');
    if (heroCommunitySelect) {
        const currentHeroVal = heroCommunitySelect.value;
        heroCommunitySelect.innerHTML = '<option value="all">All Communities</option>';
        communities.forEach(c => {
            const option = document.createElement('option');
            option.value = c.name;
            option.textContent = c.name;
            heroCommunitySelect.appendChild(option);
        });
        heroCommunitySelect.value = currentHeroVal;
    }
}

// ============= VIEW LISTING DETAIL (LEGACY MODAL SUPPORT) =============

window.viewListing = function(id, opts = {}) {
    window.viewListingPage(id, opts);
};

window.closeModal = function() {
    document.getElementById('modal').style.display = 'none';
    currentListingId = null;
};

window.scheduleViewing = function(property) {
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
        data.site_id = 'agentwebstudio';
        
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

function navigateTo(sectionId, opts = {}) {
    const { push = true, slug = null } = opts;

    document.querySelectorAll('.section').forEach(el => {
        el.classList.remove('active');
    });
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    document.querySelectorAll('.nav-menu a, .footer-links a, .floating-nav a, .nav-link, [data-section]').forEach(el => {
        el.classList.remove('active');
        if (el.dataset && el.dataset.section === sectionId) {
            el.classList.add('active');
        }
        if (el.getAttribute('href') && el.getAttribute('href').includes(sectionId)) {
            el.classList.add('active');
        }
    });

    document.querySelectorAll('.floating-nav a').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.section === sectionId) {
            el.classList.add('active');
        }
    });

    currentSection = sectionId;

    if (sectionId === 'blog') {
        const grid = document.getElementById('blog-grid');
        const detail = document.getElementById('blog-detail');
        if (grid) grid.style.display = 'grid';
        if (detail) detail.style.display = 'none';
        currentBlogPost = null;
    }

    if (sectionId === 'listings') {
        const { section, slug: routeSlug } = parseCurrentRoute();
        const filterBar = document.getElementById('filter-bar');
        
        if (routeSlug && section === 'listings') {
            const listing = listings.find(l => l.id == routeSlug || String(l.id) === String(routeSlug));
            if (listing) {
                const grid = document.getElementById('listings-grid');
                const detail = document.getElementById('listing-detail');
                if (grid) grid.style.display = 'none';
                if (filterBar) filterBar.style.display = 'none';
                if (detail) {
                    detail.style.display = 'block';
                    document.getElementById('listing-detail-content').innerHTML = renderListingDetail(listing);
                    setTimeout(initGallery, 100);
                }
                document.title = listing.title + ' | ' + (config.siteName || 'Agent Web Studio');
                return;
            }
        }
        const grid = document.getElementById('listings-grid');
        const detail = document.getElementById('listing-detail');
        if (grid) grid.style.display = 'grid';
        if (filterBar) filterBar.style.display = 'grid';
        if (detail) detail.style.display = 'none';
    }

    const sectionNames = {
        home: config.siteName || 'Agent Web Studio - Luxury Real Estate Dubai',
        listings: 'Properties | ' + (config.siteName || 'Agent Web Studio'),
        offplan: 'Off-Plan Projects | ' + (config.siteName || 'Agent Web Studio'),
        communities: 'Communities | ' + (config.siteName || 'Agent Web Studio'),
        about: 'About | ' + (config.siteName || 'Agent Web Studio'),
        contact: 'Contact | ' + (config.siteName || 'Agent Web Studio'),
        valuation: 'Valuation | ' + (config.siteName || 'Agent Web Studio'),
        goldenvisa: 'Golden Visa | ' + (config.siteName || 'Agent Web Studio'),
        blog: 'Blog | ' + (config.siteName || 'Agent Web Studio')
    };
    document.title = sectionNames[sectionId] || config.siteName || 'Agent Web Studio';

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
    } else if (sectionId === 'blog') {
        loadBlog();
    }

    if (push) {
        const path = buildPath(sectionId, slug);
        if (location.pathname + location.search !== path) {
            history.pushState({ section: sectionId, slug: slug || null }, '', path);
        }
        updateCanonical(path);
    }

    const navMenu = document.getElementById('nav-menu');
    const hamburger = document.getElementById('hamburger');
    if (navMenu) navMenu.classList.remove('active');
    if (hamburger) hamburger.classList.remove('active');
    
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

document.addEventListener('DOMContentLoaded', async function() {
    await loadAllData();
    
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
    
    document.getElementById('modal-close')?.addEventListener('click', () => window.closeModal());
    document.getElementById('modal-cancel')?.addEventListener('click', () => window.closeModal());
    window.addEventListener('click', function(e) { if (e.target === document.getElementById('modal')) window.closeModal(); });

    window.addEventListener('popstate', function() {
        document.getElementById('modal').style.display = 'none';
        handleRoute();
    });

    handleRoute();

    const filterBar = document.getElementById('filter-bar');
    const listingDetail = document.getElementById('listing-detail');
    if (listingDetail && listingDetail.style.display === 'block') {
        if (filterBar) filterBar.style.display = 'none';
    } else {
        if (filterBar) filterBar.style.display = 'grid';
    }

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
window.blogPosts = blogPosts;
window.config = config;
window.agentProfile = agentProfile;
window.loadAllData = loadAllData;
window.formatPrice = formatPrice;
window.filterListings = filterListings;
window.filterByCommunity = filterByCommunity;
window.navigateTo = navigateTo;
window.viewListing = window.viewListing;
window.viewListingPage = window.viewListingPage;
window.showListingList = window.showListingList;
window.scheduleViewing = window.scheduleViewing;
window.closeModal = window.closeModal;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleRTL = toggleRTL;
window.CONFIG = CONFIG;
window.viewBlogPost = window.viewBlogPost;
window.showBlogList = window.showBlogList;
window.loadBlog = loadBlog;
window.renderListingDetail = renderListingDetail;
window.setGalleryImage = setGalleryImage;
window.prevImage = prevImage;
window.nextImage = nextImage;
window.initGallery = initGallery;
window.openGallery = openGallery;
