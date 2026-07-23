// ================================================
// ADMIN.JS - FULL DATABASE INTEGRATION + SIDEBAR UI
// ================================================

import { CONFIG } from './config.js';

// ============= STATE =============
let currentUser = null;
let currentTab = 'dashboard';
let leadsData = [];
let editingId = null;
let editingType = null;
let listingsData = [];
let offplanData = [];
let communitiesData = [];
let profileData = {};
let sidebarCollapsed = false;

// ============= DOM REFS =============
const loginScreen = document.getElementById('login-screen');
const adminDashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const passwordInput = document.getElementById('admin-password');

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
    }, 3500);
}

// ============= IMAGE COMPRESSION & R2 UPLOAD HELPER =============
function compressImageToBlob(file, maxWidth) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.8);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function setupImageInput(inputId, isMultiple = false) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    input.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        const hiddenInput = document.getElementById(`hidden-${input.name}`);
        if (!hiddenInput) return;
        
        const uploadedUrls = [];
        showToast('Uploading image(s)...', 'info');
        
        for (const file of files) {
            const compressedBlob = await compressImageToBlob(file, 1200);
            
            const formData = new FormData();
            formData.append('file', compressedBlob, file.name);
            
            try {
                const token = localStorage.getItem('ak_admin_token');
                const response = await fetch(`${API_BASE}/api/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                const data = await response.json();
                if (data.success) {
                    uploadedUrls.push(data.url);
                } else {
                    showToast('Upload failed: ' + data.message, 'error');
                }
            } catch (err) {
                showToast('Network error during upload.', 'error');
            }
        }
        
        if (uploadedUrls.length > 0) {
            if (isMultiple) {
                const existing = hiddenInput.value ? hiddenInput.value.split(',') : [];
                hiddenInput.value = [...existing, ...uploadedUrls].join(',');
            } else {
                hiddenInput.value = uploadedUrls[0];
            }
            showToast('✅ Image(s) uploaded successfully!', 'success');
        }
    });
}

// ============= AUTHENTICATION =============

async function login(password) {
    try {
        loginError.textContent = 'Logging in...';
        loginBtn.disabled = true;
        
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            localStorage.setItem('ak_admin_token', data.token);
            localStorage.setItem('ak_admin_user', JSON.stringify(data.user));
            currentUser = data.user;
            showDashboard();
            loadAllData();
            loginError.textContent = '';
            loginBtn.disabled = false;
            return true;
        } else {
            loginError.textContent = data.message || 'Invalid password. Please try again.';
            loginBtn.disabled = false;
            return false;
        }
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'Connection error. Please check your network and try again.';
        loginBtn.disabled = false;
        return false;
    }
}

function checkAuth() {
    const token = localStorage.getItem('ak_admin_token');
    const user = localStorage.getItem('ak_admin_user');
    
    if (token && user) {
        verifyToken(token).then(isValid => {
            if (isValid) {
                currentUser = JSON.parse(user);
                showDashboard();
                loadAllData();
            } else {
                localStorage.removeItem('ak_admin_token');
                localStorage.removeItem('ak_admin_user');
                showLogin();
            }
        });
        return true;
    }
    showLogin();
    return false;
}

async function verifyToken(token) {
    try {
        const response = await fetch(`${API_BASE}/admin/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.error('Token verification error:', error);
        return false;
    }
}

function logout() {
    const token = localStorage.getItem('ak_admin_token');
    if (token) {
        fetch(`${API_BASE}/admin/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {});
    }
    localStorage.removeItem('ak_admin_token');
    localStorage.removeItem('ak_admin_user');
    currentUser = null;
    showLogin();
}

function showDashboard() {
    if (loginScreen) loginScreen.style.display = 'none';
    if (adminDashboard) adminDashboard.style.display = 'block';
}

function showLogin() {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (adminDashboard) adminDashboard.style.display = 'none';
    if (loginForm) loginForm.reset();
    if (loginError) loginError.textContent = '';
}

function getAuthHeaders() {
    const token = localStorage.getItem('ak_admin_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// ============= SIDEBAR FUNCTIONS =============

function toggleSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    if (!sidebar) return;
    sidebarCollapsed = !sidebarCollapsed;
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('ak_sidebar_collapsed', sidebarCollapsed ? 'true' : 'false');
}

function navigateTab(tab) {
    // Update sidebar links
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.tab === tab);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.toggle('active', el.id === `tab-${tab}`);
    });
    
    // Show/hide dashboard stats (only on dashboard tab)
    const statsSection = document.getElementById('dashboard-stats');
    if (statsSection) {
        statsSection.style.display = tab === 'dashboard' ? 'block' : 'none';
    }
    
    // Show/hide quick actions
    const quickActions = document.querySelector('.quick-actions');
    if (quickActions) {
        quickActions.style.display = tab === 'dashboard' ? 'flex' : 'none';
    }
    
    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        listings: 'Listings',
        offplan: 'Off-Plan Projects',
        communities: 'Communities',
        leads: 'Leads',
        profile: 'Profile'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = titles[tab] || 'Dashboard';
    
    currentTab = tab;
    
    // Load data for the tab
    if (tab === 'leads') loadLeads();
    if (tab === 'listings') loadListings();
    if (tab === 'offplan') loadOffplan();
    if (tab === 'communities') loadCommunities();
    if (tab === 'profile') loadProfile();
    if (tab === 'dashboard') updateStats();
}

// Expose navigateTab globally for quick action cards
window.navigateTab = navigateTab;

// ============= LOAD DATA FROM API =============

async function loadAllData() {
    await Promise.all([
        loadListings(),
        loadOffplan(),
        loadCommunities(),
        loadProfile(),
        loadLeads()
    ]);
    updateStats();
    updateSidebarBadges();
}

async function loadListings() {
    try {
        const response = await fetch(`${API_BASE}/api/listings?t=${Date.now()}`);
        const data = await response.json();
        if (data.success) {
            listingsData = data.listings;
            renderListingsTable();
            updateSidebarBadges();
        }
    } catch (error) {
        console.error('Error loading listings:', error);
        showError('listings-table-body', 'Failed to load listings');
    }
}

async function loadOffplan() {
    try {
        const response = await fetch(`${API_BASE}/api/offplan?t=${Date.now()}`);
        const data = await response.json();
        if (data.success) {
            offplanData = data.projects;
            renderOffplanTable();
            updateSidebarBadges();
        }
    } catch (error) {
        console.error('Error loading offplan:', error);
        showError('offplan-table-body', 'Failed to load off-plan projects');
    }
}

async function loadCommunities() {
    try {
        const response = await fetch(`${API_BASE}/api/communities?t=${Date.now()}`);
        const data = await response.json();
        if (data.success) {
            communitiesData = data.communities;
            renderCommunitiesTable();
            updateSidebarBadges();
        }
    } catch (error) {
        console.error('Error loading communities:', error);
        showError('communities-table-body', 'Failed to load communities');
    }
}

async function loadProfile() {
    try {
        const response = await fetch(`${API_BASE}/api/agent-profile?t=${Date.now()}`);
        const data = await response.json();
        if (data.success) {
            profileData = data.profile;
            renderProfileForm();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function loadLeads() {
    try {
        const token = localStorage.getItem('ak_admin_token');
        if (!token) return;
        
        const response = await fetch(`${API_BASE}/admin/leads`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            leadsData = data.leads || [];
            renderLeadsTable();
            updateStats();
            updateSidebarBadges();
        }
    } catch (error) {
        console.error('Error loading leads:', error);
        showError('leads-table-body', 'Failed to load leads');
    }
}

// ============= UPDATE SIDEBAR BADGES =============

function updateSidebarBadges() {
    const listingBadge = document.getElementById('sidebar-listings-count');
    const offplanBadge = document.getElementById('sidebar-offplan-count');
    const communitiesBadge = document.getElementById('sidebar-communities-count');
    const leadsBadge = document.getElementById('sidebar-leads-count');
    
    if (listingBadge) listingBadge.textContent = listingsData.length || 0;
    if (offplanBadge) offplanBadge.textContent = offplanData.length || 0;
    if (communitiesBadge) communitiesBadge.textContent = communitiesData.length || 0;
    if (leadsBadge) leadsBadge.textContent = leadsData.length || 0;
}

// ============= RENDER TABLES =============

function renderListingsTable() {
    const tbody = document.getElementById('listings-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!listingsData || listingsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">No listings found. Click "Add New Listing" to create one.</td></tr>';
        return;
    }
    
    listingsData.forEach(listing => {
        const tr = document.createElement('tr');
        const images = listing.images && typeof listing.images === 'string' ? listing.images.split(',') : (listing.images || []);
        const firstImage = Array.isArray(images) && images.length > 0 ? images[0] : 'https://via.placeholder.com/60x60/0A1628/C9A84C?text=Property';
        
        tr.innerHTML = `
            <td><img src="${firstImage}" alt="${listing.title}" class="thumb"></td>
            <td><strong>${listing.title}</strong></td>
            <td>AED ${formatPrice(listing.price)}</td>
            <td>${listing.community}</td>
            <td><span class="table-status ${listing.status}">${listing.status.replace('-', ' ')}</span></td>
            <td>${listing.featured ? '⭐' : ''}</td>
            <td class="actions">
                <button class="btn btn-primary btn-sm" onclick="window.editListing('${listing.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="window.deleteListing('${listing.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderOffplanTable() {
    const tbody = document.getElementById('offplan-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!offplanData || offplanData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">No off-plan projects found. Click "Add New Project" to create one.</td></tr>';
        return;
    }
    
    offplanData.forEach(project => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${project.projectName}</strong></td>
            <td>${project.developer}</td>
            <td>${project.community}</td>
            <td>AED ${formatPrice(project.startingPrice)}</td>
            <td>${project.goldenVisaEligible ? '✅' : '❌'}</td>
            <td>${project.featured ? '⭐' : ''}</td>
            <td class="actions">
                <button class="btn btn-primary btn-sm" onclick="window.editOffplan('${project.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="window.deleteOffplan('${project.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderCommunitiesTable() {
    const tbody = document.getElementById('communities-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!communitiesData || communitiesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">No communities found. Click "Add New Community" to create one.</td></tr>';
        return;
    }
    
    communitiesData.forEach(community => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${community.name}</strong></td>
            <td>${community.communityType}</td>
            <td>${community.avgApartmentPrice}</td>
            <td>${community.avgVillaPrice}</td>
            <td>${community.popular ? '⭐' : ''}</td>
            <td class="actions">
                <button class="btn btn-primary btn-sm" onclick="window.editCommunity('${community.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="window.deleteCommunity('${community.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderProfileForm() {
    if (!profileData) return;
    document.getElementById('prof-agent-name').value = profileData.agentName || '';
    document.getElementById('prof-agent-title').value = profileData.agentTitle || '';
    document.getElementById('prof-rerna').value = profileData.rernaBRN || '';
    document.getElementById('prof-experience').value = profileData.experience || '';
    document.getElementById('prof-bio').value = profileData.bio || '';
    document.getElementById('prof-languages').value = profileData.languages || '';
    document.getElementById('prof-specialties').value = profileData.specialties || '';
    document.getElementById('prof-agency-name').value = profileData.agencyName || '';
    document.getElementById('prof-address').value = profileData.address || '';
    document.getElementById('prof-rerna-number').value = profileData.rernaNumber || '';
    document.getElementById('prof-phone').value = profileData.phone || '';
    document.getElementById('prof-whatsapp').value = profileData.whatsapp || '';
    document.getElementById('prof-email').value = profileData.email || '';
    document.getElementById('prof-whatsapp-greeting').value = profileData.whatsappGreeting || '';
    document.getElementById('prof-propertyfinder').value = profileData.propertyFinderURL || '';
    document.getElementById('prof-bayut').value = profileData.bayutURL || '';
    document.getElementById('prof-worker-url').value = profileData.workerURL || '';
    document.getElementById('prof-ga-id').value = profileData.gaTrackingID || '';
    document.getElementById('prof-facebook').value = profileData.facebook || '';
    document.getElementById('prof-instagram').value = profileData.instagram || '';
    document.getElementById('prof-linkedin').value = profileData.linkedin || '';
    document.getElementById('prof-youtube').value = profileData.youtube || '';
    document.getElementById('prof-site-name').value = profileData.siteName || '';
    document.getElementById('prof-site-description').value = profileData.siteDescription || '';
}

function renderLeadsTable() {
    const tbody = document.getElementById('leads-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!leadsData || leadsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">No leads found.</td></tr>';
        return;
    }
    
    leadsData.forEach(lead => {
        const tr = document.createElement('tr');
        const statusClass = lead.contacted ? 'contacted' : 'pending';
        const statusText = lead.contacted ? '✅ Contacted' : '⏳ Pending';
        
        tr.innerHTML = `
            <td>${formatDate(lead.created_at || lead.createdAt)}</td>
            <td>${lead.name || 'N/A'}</td>
            <td>${lead.phone || 'N/A'}</td>
            <td>${lead.email || 'N/A'}</td>
            <td><span class="table-status ${lead.type || 'new'}">${lead.type || 'N/A'}</span></td>
            <td><button class="btn btn-secondary btn-sm" onclick="window.viewLeadDetails('${lead.id}')">View</button></td>
            <td>${lead.phone ? `<a href="https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}" target="_blank" class="btn btn-success btn-sm">WhatsApp</a>` : 'N/A'}</td>
            <td>
                <span class="table-status ${statusClass}">${statusText}</span>
                ${!lead.contacted ? `<button class="btn btn-success btn-sm" onclick="window.markLeadContacted('${lead.id}')" style="margin-top:4px;">Mark Contacted</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:#DC3545;">${message}</td></tr>`;
    }
}

// ============= STATS =============

function updateStats() {
    const activeListings = listingsData.filter(l => l.status === 'for-sale' || l.status === 'for-rent').length;
    document.getElementById('active-listings').textContent = activeListings;
    document.getElementById('offplan-count').textContent = offplanData.length;
    document.getElementById('communities-count').textContent = communitiesData.length;
    document.getElementById('total-leads').textContent = leadsData.length || 0;
    
    if (leadsData.length > 0) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30);
        
        document.getElementById('leads-today').textContent = leadsData.filter(l => new Date(l.created_at || l.createdAt) >= today).length;
        document.getElementById('leads-week').textContent = leadsData.filter(l => new Date(l.created_at || l.createdAt) >= weekAgo).length;
        document.getElementById('leads-month').textContent = leadsData.filter(l => new Date(l.created_at || l.createdAt) >= monthAgo).length;
    }
}

// ============= CRUD - LISTINGS =============

window.editListing = function(id) {
    const listing = listingsData.find(l => l.id === id);
    if (!listing) return;
    editingId = id;
    editingType = 'listing';
    openModal('Edit Listing', buildListingForm(listing));
};

window.deleteListing = async function(id) {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
        const response = await fetch(`${API_BASE}/api/listings/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            await loadListings(); updateStats(); updateSidebarBadges();
            showToast('Listing deleted successfully!', 'success');
        } else { showToast('Failed to delete: ' + data.message, 'error'); }
    } catch (error) { console.error('Delete error:', error); showToast('Error deleting listing.', 'error'); }
};

async function saveListing(formData) {
    const listing = {
        id: editingId || null,
        title: formData.get('title') || '',
        type: formData.get('type') || 'Apartment',
        status: formData.get('status') || 'for-sale',
        price: parseFloat(formData.get('price')) || 0,
        community: formData.get('community') || '',
        building: formData.get('building') || '',
        bedrooms: parseInt(formData.get('bedrooms')) || 0,
        bathrooms: parseInt(formData.get('bathrooms')) || 0,
        sqft: parseInt(formData.get('sqft')) || 0,
        floor: formData.get('floor') || '',
        view: formData.get('view') || '',
        furnishing: formData.get('furnishing') || '',
        parking: parseInt(formData.get('parking')) || 0,
        permit: formData.get('permit') || '',
        description: formData.get('description') || '',
        features: (formData.get('features') || '').split(',').map(f => f.trim()).filter(f => f),
        images: formData.get('images_hidden') || '',
        whatsappText: formData.get('whatsappText') || "I'm interested in this property",
        featured: formData.get('featured') === 'true'
    };
    Object.keys(listing).forEach(key => { if (listing[key] === undefined) listing[key] = null; });
    
    try {
        const response = await fetch(`${API_BASE}/api/listings`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(listing) });
        const data = await response.json();
        if (data.success) {
            closeModal(); await loadListings(); updateStats(); updateSidebarBadges();
            showToast('✅ Listing saved successfully!', 'success');
            editingId = null; editingType = null;
        } else { showToast('❌ Failed to save: ' + data.message, 'error'); }
    } catch (error) { console.error('Save error:', error); showToast('❌ Error saving listing.', 'error'); }
}

function buildListingForm(listing = null) {
    const safeJoin = (val) => Array.isArray(val) ? val.join(', ') : (typeof val === 'string' ? val : '');
    const fields = [
        { type: 'text', name: 'title', label: 'Title', value: listing?.title || '' },
        { type: 'select', name: 'type', label: 'Type', value: listing?.type || 'Apartment', options: ['Apartment', 'Villa', 'Penthouse', 'Studio', 'Townhouse'] },
        { type: 'select', name: 'status', label: 'Status', value: listing?.status || 'for-sale', options: ['for-sale', 'for-rent', 'sold'] },
        { type: 'number', name: 'price', label: 'Price (AED)', value: listing?.price || '' },
        { type: 'text', name: 'community', label: 'Community', value: listing?.community || '' },
        { type: 'text', name: 'building', label: 'Building', value: listing?.building || '' },
        { type: 'number', name: 'bedrooms', label: 'Bedrooms', value: listing?.bedrooms || 0 },
        { type: 'number', name: 'bathrooms', label: 'Bathrooms', value: listing?.bathrooms || 0 },
        { type: 'number', name: 'sqft', label: 'Sqft', value: listing?.sqft || 0 },
        { type: 'text', name: 'floor', label: 'Floor', value: listing?.floor || '' },
        { type: 'text', name: 'view', label: 'View', value: listing?.view || '' },
        { type: 'text', name: 'furnishing', label: 'Furnishing', value: listing?.furnishing || '' },
        { type: 'number', name: 'parking', label: 'Parking Spaces', value: listing?.parking || 0 },
        { type: 'text', name: 'permit', label: 'Trakheesi Permit', value: listing?.permit || '' },
        { type: 'textarea', name: 'description', label: 'Description', value: listing?.description || '' },
        { type: 'text', name: 'features', label: 'Features (comma separated)', value: safeJoin(listing?.features) },
        { type: 'file', name: 'images', label: 'Upload Images (You can select multiple)', value: listing?.images || '', multiple: true },
        { type: 'text', name: 'whatsappText', label: 'WhatsApp Text', value: listing?.whatsappText || '' },
        { type: 'checkbox', name: 'featured', label: 'Featured', value: listing?.featured || false }
    ];
    return buildFormHTML('listing-form', fields);
}

// ============= CRUD - OFFPLAN =============

window.editOffplan = function(id) {
    const project = offplanData.find(p => p.id === id);
    if (!project) return;
    editingId = id;
    editingType = 'offplan';
    openModal('Edit Off-Plan Project', buildOffplanForm(project));
};

window.deleteOffplan = async function(id) {
    if (!confirm('Are you sure you want to delete this off-plan project?')) return;
    try {
        const response = await fetch(`${API_BASE}/api/offplan/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) { await loadOffplan(); updateStats(); updateSidebarBadges(); showToast('Project deleted successfully!', 'success'); }
        else { showToast('Failed to delete: ' + data.message, 'error'); }
    } catch (error) { console.error('Delete error:', error); showToast('Error deleting project.', 'error'); }
};

async function saveOffplan(formData) {
    const project = {
        id: editingId || null,
        projectName: formData.get('projectName') || '',
        developer: formData.get('developer') || '',
        community: formData.get('community') || '',
        types: (formData.get('types') || '').split(',').map(t => t.trim()).filter(t => t),
        startingPrice: parseFloat(formData.get('startingPrice')) || 0,
        handoverDate: formData.get('handoverDate') || '',
        paymentPlan: {
            downPayment: formData.get('downPayment') || '20',
            duringConstruction: formData.get('duringConstruction') || '50',
            onHandover: formData.get('onHandover') || '30',
            display: `${formData.get('downPayment') || '20'}% Down | ${formData.get('duringConstruction') || '50'}% Construction | ${formData.get('onHandover') || '30'}% Handover`
        },
        description: formData.get('description') || '',
        highlights: (formData.get('highlights') || '').split(',').map(h => h.trim()).filter(h => h),
        goldenVisaEligible: formData.get('goldenVisaEligible') === 'true',
        image: formData.get('image_hidden') || '',
        brochureWhatsApp: formData.get('brochureWhatsApp') || "I'm interested in this off-plan project",
        featured: formData.get('featured') === 'true'
    };
    Object.keys(project).forEach(key => { if (project[key] === undefined) project[key] = null; });
    
    try {
        const response = await fetch(`${API_BASE}/api/offplan`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(project) });
        const data = await response.json();
        if (data.success) {
            closeModal(); await loadOffplan(); updateStats(); updateSidebarBadges();
            showToast('✅ Off-plan project saved successfully!', 'success');
            editingId = null; editingType = null;
        } else { showToast('❌ Failed to save: ' + data.message, 'error'); }
    } catch (error) { console.error('Save error:', error); showToast('❌ Error saving project.', 'error'); }
}

function buildOffplanForm(project = null) {
    const safeJoin = (val) => Array.isArray(val) ? val.join(', ') : (typeof val === 'string' ? val : '');
    const fields = [
        { type: 'text', name: 'projectName', label: 'Project Name', value: project?.projectName || '' },
        { type: 'text', name: 'developer', label: 'Developer', value: project?.developer || '' },
        { type: 'text', name: 'community', label: 'Community', value: project?.community || '' },
        { type: 'text', name: 'types', label: 'Types (comma separated)', value: safeJoin(project?.types) },
        { type: 'number', name: 'startingPrice', label: 'Starting Price (AED)', value: project?.startingPrice || '' },
        { type: 'text', name: 'handoverDate', label: 'Handover Date', value: project?.handoverDate || '' },
        { type: 'number', name: 'downPayment', label: 'Down Payment %', value: project?.paymentPlan?.downPayment?.replace('%', '') || 20 },
        { type: 'number', name: 'duringConstruction', label: 'During Construction %', value: project?.paymentPlan?.duringConstruction?.replace('%', '') || 50 },
        { type: 'number', name: 'onHandover', label: 'On Handover %', value: project?.paymentPlan?.onHandover?.replace('%', '') || 30 },
        { type: 'textarea', name: 'description', label: 'Description', value: project?.description || '' },
        { type: 'text', name: 'highlights', label: 'Highlights (comma separated)', value: safeJoin(project?.highlights) },
        { type: 'checkbox', name: 'goldenVisaEligible', label: 'Golden Visa Eligible', value: project?.goldenVisaEligible || false },
        { type: 'file', name: 'image', label: 'Upload Project Image', value: project?.image || '', multiple: false },
        { type: 'text', name: 'brochureWhatsApp', label: 'Brochure WhatsApp Text', value: project?.brochureWhatsApp || '' },
        { type: 'checkbox', name: 'featured', label: 'Featured', value: project?.featured || false }
    ];
    return buildFormHTML('offplan-form', fields);
}

// ============= CRUD - COMMUNITIES =============

window.editCommunity = function(id) {
    const community = communitiesData.find(c => c.id === id);
    if (!community) return;
    editingId = id;
    editingType = 'community';
    openModal('Edit Community', buildCommunityForm(community));
};

window.deleteCommunity = async function(id) {
    if (!confirm('Are you sure you want to delete this community?')) return;
    try {
        const response = await fetch(`${API_BASE}/api/communities/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) { await loadCommunities(); updateStats(); updateSidebarBadges(); showToast('Community deleted successfully!', 'success'); }
        else { showToast('Failed to delete: ' + data.message, 'error'); }
    } catch (error) { console.error('Delete error:', error); showToast('Error deleting community.', 'error'); }
};

async function saveCommunity(formData) {
    const community = {
        id: editingId || null,
        name: formData.get('name') || '',
        slug: formData.get('slug') || (formData.get('name') || '').toLowerCase().replace(/\s+/g, '-'),
        description: formData.get('description') || '',
        lifestyle: formData.get('lifestyle') || '',
        avgApartmentPrice: formData.get('avgApartmentPrice') || '',
        avgVillaPrice: formData.get('avgVillaPrice') || '',
        avgRentalYield: formData.get('avgRentalYield') || '',
        avgRent1BR: formData.get('avgRent1BR') || '',
        avgRent2BR: formData.get('avgRent2BR') || '',
        highlights: (formData.get('highlights') || '').split(',').map(h => h.trim()).filter(h => h),
        nearbyLandmarks: (formData.get('nearbyLandmarks') || '').split(',').map(l => l.trim()).filter(l => l),
        metroStation: formData.get('metroStation') || '',
        communityType: formData.get('communityType') || 'Family',
        popular: formData.get('popular') === 'true'
    };
    Object.keys(community).forEach(key => { if (community[key] === undefined) community[key] = null; });
    
    try {
        const response = await fetch(`${API_BASE}/api/communities`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(community) });
        const data = await response.json();
        if (data.success) {
            closeModal(); await loadCommunities(); updateStats(); updateSidebarBadges();
            showToast('✅ Community saved successfully!', 'success');
            editingId = null; editingType = null;
        } else { showToast('❌ Failed to save: ' + data.message, 'error'); }
    } catch (error) { console.error('Save error:', error); showToast('❌ Error saving community.', 'error'); }
}

function buildCommunityForm(community = null) {
    const safeJoin = (val) => Array.isArray(val) ? val.join(', ') : (typeof val === 'string' ? val : '');
    const fields = [
        { type: 'text', name: 'name', label: 'Name', value: community?.name || '' },
        { type: 'text', name: 'slug', label: 'Slug (URL)', value: community?.slug || '' },
        { type: 'textarea', name: 'description', label: 'Description', value: community?.description || '' },
        { type: 'text', name: 'lifestyle', label: 'Lifestyle', value: community?.lifestyle || '' },
        { type: 'text', name: 'avgApartmentPrice', label: 'Avg Apartment Price', value: community?.avgApartmentPrice || '' },
        { type: 'text', name: 'avgVillaPrice', label: 'Avg Villa Price', value: community?.avgVillaPrice || '' },
        { type: 'text', name: 'avgRentalYield', label: 'Avg Rental Yield', value: community?.avgRentalYield || '' },
        { type: 'text', name: 'avgRent1BR', label: 'Avg Rent 1BR', value: community?.avgRent1BR || '' },
        { type: 'text', name: 'avgRent2BR', label: 'Avg Rent 2BR', value: community?.avgRent2BR || '' },
        { type: 'text', name: 'highlights', label: 'Highlights (comma separated)', value: safeJoin(community?.highlights) },
        { type: 'text', name: 'nearbyLandmarks', label: 'Nearby Landmarks (comma separated)', value: safeJoin(community?.nearbyLandmarks) },
        { type: 'text', name: 'metroStation', label: 'Metro Station', value: community?.metroStation || '' },
        { type: 'select', name: 'communityType', label: 'Community Type', value: community?.communityType || 'Family', options: ['Urban', 'Luxury', 'Waterfront', 'Family'] },
        { type: 'checkbox', name: 'popular', label: 'Popular', value: community?.popular || false }
    ];
    return buildFormHTML('community-form', fields);
}

// ============= PROFILE SAVE =============

async function saveProfile(formData) {
    const config = {
        agentName: formData.get('agentName') || '',
        agentTitle: formData.get('agentTitle') || '',
        rernaBRN: formData.get('rerna') || '',
        experience: formData.get('experience') || '',
        bio: formData.get('bio') || '',
        languages: formData.get('languages') || '',
        specialties: formData.get('specialties') || '',
        agencyName: formData.get('agencyName') || '',
        agencyLogo: formData.get('agencyLogo') || '',
        address: formData.get('address') || '',
        rernaNumber: formData.get('rernaNumber') || '',
        phone: formData.get('phone') || '',
        whatsapp: formData.get('whatsapp') || '',
        email: formData.get('email') || '',
        whatsappGreeting: formData.get('whatsappGreeting') || '',
        propertyFinderURL: formData.get('propertyfinder') || '',
        bayutURL: formData.get('bayut') || '',
        workerURL: formData.get('workerUrl') || '',
        gaTrackingID: formData.get('gaId') || '',
        facebook: formData.get('facebook') || '',
        instagram: formData.get('instagram') || '',
        linkedin: formData.get('linkedin') || '',
        youtube: formData.get('youtube') || '',
        siteName: formData.get('siteName') || '',
        siteDescription: formData.get('siteDescription') || '',
        photo: formData.get('photo') || ''
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/agent-profile`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(config) });
        const data = await response.json();
        if (data.success) {
            showToast('✅ Profile saved successfully! Changes are live.', 'success');
            await loadProfile();
        } else { showToast('❌ Failed to save: ' + data.message, 'error'); }
    } catch (error) { console.error('Save error:', error); showToast('❌ Error saving profile.', 'error'); }
}

// ============= HELPER FOR FORM HTML =============
function buildFormHTML(formId, fields) {
    let html = `<form id="${formId}">`;
    fields.forEach(f => {
        html += `<div class="form-group">`;
        html += `<label for="edit-${f.name}">${f.label}</label>`;
        
        if (f.type === 'select') {
            html += `<select id="edit-${f.name}" name="${f.name}">`;
            f.options.forEach(opt => { html += `<option value="${opt}" ${f.value === opt ? 'selected' : ''}>${opt}</option>`; });
            html += `</select>`;
        } else if (f.type === 'textarea') {
            html += `<textarea id="edit-${f.name}" name="${f.name}" rows="3">${f.value || ''}</textarea>`;
        } else if (f.type === 'checkbox') {
            html += `<input type="checkbox" id="edit-${f.name}" name="${f.name}" value="true" ${f.value ? 'checked' : ''}>`;
        } else if (f.type === 'file') {
            html += `<input type="file" id="edit-${f.name}" name="${f.name}" accept="image/*" ${f.multiple ? 'multiple' : ''}>`;
            html += `<input type="hidden" id="hidden-${f.name}" name="${f.name}_hidden" value="${f.value || ''}">`;
            if (f.value) {
                 html += `<small style="display:block;margin-top:4px;color:var(--dark-grey);">Current image will be kept unless you upload a new one.</small>`;
            }
        } else {
            html += `<input type="${f.type}" id="edit-${f.name}" name="${f.name}" value="${f.value || ''}">`;
        }
        html += `</div>`;
    });
    html += '</form>';
    return html;
}

// ============= LEAD MANAGEMENT =============

window.viewLeadDetails = function(id) {
    const lead = leadsData.find(l => l.id == id);
    if (!lead) return;
    
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');
    
    modalTitle.textContent = `Lead Details`;
    modalFooter.style.display = 'none'; 
    
    const formatLabel = (val) => val ? val : 'N/A';
    const ignoreKeys = ['id', 'name', 'phone', 'email', 'created_at', 'createdAt', 'contacted', 'type', 'site_id'];
    let extraDetailsHtml = '';
    
    for (const [key, value] of Object.entries(lead)) {
        if (ignoreKeys.includes(key) || value === null || value === undefined || value === '') continue;
        let label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        let valStr = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value;
        extraDetailsHtml += `<div class="lead-extra-item"><small>${label}</small><strong>${valStr}</strong></div>`;
    }
    
    modalBody.innerHTML = `
        <div class="lead-detail-container">
            <div class="lead-detail-header">
                <div class="lead-avatar">${lead.name ? lead.name.charAt(0).toUpperCase() : '?'}</div>
                <div>
                    <h3>${formatLabel(lead.name)}</h3>
                    <span class="lead-type-badge">${formatLabel(lead.type)}</span>
                </div>
            </div>
            <div class="lead-info-grid">
                <div class="lead-info-item"><div class="icon">📞</div><div><small>Phone</small><strong>${formatLabel(lead.phone)}</strong></div></div>
                <div class="lead-info-item"><div class="icon">✉️</div><div><small>Email</small><strong>${formatLabel(lead.email)}</strong></div></div>
                <div class="lead-info-item"><div class="icon">🗓️</div><div><small>Received</small><strong>${formatDate(lead.created_at || lead.createdAt)}</strong></div></div>
                <div class="lead-info-item"><div class="icon">🔄</div><div><small>Status</small><strong style="color: ${lead.contacted ? '#28A745' : '#FFC107'}">${lead.contacted ? 'Contacted' : 'Pending'}</strong></div></div>
            </div>
            ${extraDetailsHtml ? `<div class="lead-message-box"><h4>Submitted Details</h4><div class="lead-extra-grid">${extraDetailsHtml}</div></div>` : ''}
            <div class="lead-detail-footer">
                <button class="btn btn-secondary" onclick="window.closeModal()">Close</button>
                ${!lead.contacted ? `<button class="btn btn-success" onclick="window.markLeadContacted('${lead.id}')">Mark as Contacted</button>` : ''}
                ${lead.phone ? `<a href="https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}" target="_blank" class="btn btn-whatsapp">Contact on WhatsApp</a>` : ''}
            </div>
        </div>
    `;
    modal.style.display = 'flex';
};

window.markLeadContacted = function(id) {
    if (!confirm('Mark this lead as contacted?')) return;
    const lead = leadsData.find(l => l.id == id);
    if (lead) { 
        lead.contacted = 1; 
        renderLeadsTable(); 
        updateStats(); 
        updateSidebarBadges();
        closeModal();
        showToast('✅ Lead marked as contacted!', 'success');
    }
};

function exportCSV() {
    if (leadsData.length === 0) { showToast('No leads to export.', 'info'); return; }
    const headers = ['Date', 'Name', 'Phone', 'Email', 'Type', 'Status'];
    const rows = leadsData.map(lead => [formatDate(lead.created_at || lead.createdAt), lead.name || '', lead.phone || '', lead.email || '', lead.type || '', lead.contacted ? 'Contacted' : 'Pending']);
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function filterLeads() {
    const type = document.getElementById('lead-type')?.value || 'all';
    let filtered = [...leadsData];
    if (type !== 'all') filtered = filtered.filter(l => l.type === type);
    renderLeadsTable(filtered);
}

// ============= MODAL FUNCTIONS =============

function openModal(title, bodyHTML) {
    const modal = document.getElementById('modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-footer').style.display = 'flex'; 
    modal.style.display = 'flex';
    
    setupImageInput('edit-images', true);
    setupImageInput('edit-image', false);
    
    document.getElementById('modal-save').onclick = function() {
        const form = document.querySelector('#modal-body form');
        if (!form) { showToast('Form not found', 'error'); return; }
        const formData = new FormData(form);
        if (editingType === 'listing') saveListing(formData);
        else if (editingType === 'offplan') saveOffplan(formData);
        else if (editingType === 'community') saveCommunity(formData);
    };
}

window.closeModal = function() {
    document.getElementById('modal').style.display = 'none';
    editingId = null; editingType = null;
};

// ============= UTILITY =============

function formatPrice(price) {
    if (!price) return '0';
    if (price >= 1000000) return (price / 1000000).toFixed(1) + 'M';
    return price.toLocaleString();
}

function formatDate(date) {
    if (!date) return 'N/A';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return 'N/A'; }
}

// ============= EVENT LISTENERS =============

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mobileToggle = document.getElementById('mobile-sidebar-toggle');
    const sidebar = document.getElementById('admin-sidebar');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            if (sidebar) sidebar.classList.toggle('collapsed');
        });
    }
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', function() {
            if (sidebar) {
                sidebar.classList.toggle('collapsed');
                // On mobile, also toggle a mobile-open class
                sidebar.classList.toggle('mobile-open');
            }
        });
    }
    
    // Profile image upload listeners
    setupImageInput('prof-agent-photo', false);
    setupImageInput('prof-agency-logo', false);
    
    if (loginForm) loginForm.addEventListener('submit', async function(e) { e.preventDefault(); await login(document.getElementById('admin-password').value); });
    if (loginBtn) loginBtn.addEventListener('click', async function(e) { e.preventDefault(); await login(document.getElementById('admin-password').value); });
    if (passwordInput) passwordInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') { e.preventDefault(); loginForm.dispatchEvent(new Event('submit')); } });
    if (logoutBtn) logoutBtn.addEventListener('click', function(e) { e.preventDefault(); if (confirm('Are you sure you want to logout?')) logout(); });
    
    // Sidebar logout
    document.getElementById('logout-btn-sidebar')?.addEventListener('click', function(e) { e.preventDefault(); if (confirm('Are you sure you want to logout?')) logout(); });
    
    // Sidebar navigation
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tab = this.dataset.tab;
            if (tab) navigateTab(tab);
        });
    });
    
    // Quick action buttons
    document.querySelectorAll('.quick-actions .btn, [data-tab]').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            if (tab) {
                navigateTab(tab);
                document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => {
                    l.classList.toggle('active', l.dataset.tab === tab);
                });
            }
        });
    });
    
    // Add buttons
    document.getElementById('add-listing-btn')?.addEventListener('click', () => { editingId = null; editingType = 'listing'; openModal('Add New Listing', buildListingForm()); });
    document.getElementById('add-offplan-btn')?.addEventListener('click', () => { editingId = null; editingType = 'offplan'; openModal('Add New Off-Plan Project', buildOffplanForm()); });
    document.getElementById('add-community-btn')?.addEventListener('click', () => { editingId = null; editingType = 'community'; openModal('Add New Community', buildCommunityForm()); });
    
    // Profile form
    document.getElementById('profile-form')?.addEventListener('submit', function(e) { e.preventDefault(); saveProfile(new FormData(this)); });
    
    // Leads filters
    document.getElementById('filter-leads-btn')?.addEventListener('click', filterLeads);
    document.getElementById('export-leads-btn')?.addEventListener('click', exportCSV);
    
    // Modal
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('modal')?.addEventListener('click', function(e) { if (e.target === this) closeModal(); });
    
    // Auto-refresh
    setInterval(() => { if (currentUser) { loadLeads(); updateStats(); } }, 30000);
    setInterval(() => { if (currentUser && currentTab === 'dashboard') { updateStats(); } }, 30000);
    
    // Load default tab (Dashboard)
    navigateTab('dashboard');
});
