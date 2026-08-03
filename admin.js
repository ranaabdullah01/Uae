// ================================================
// ADMIN.JS - FULL DATABASE INTEGRATION + SIDEBAR UI + BLOG WITH QUILL
// Typography: Plus Jakarta Sans for headings, Inter for body
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
let blogData = [];
let profileData = {};
let sidebarCollapsed = false;

// ============= QUILL EDITOR REFERENCE =============
let quillEditor = null;
let quillInitialized = false;

// ============= DOM REFS =============
const loginScreen = document.getElementById('login-screen');
const adminDashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const passwordInput = document.getElementById('admin-password');
const sidebar = document.getElementById('admin-sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');

// ============= API BASE URL =============
const API_BASE = CONFIG.workerURL || 'https://ranabullah01.ranabullah01.workers.dev';

// ============= TOAST NOTIFICATION =============
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.log(message);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fadeout');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ============= IMAGE COMPRESSION =============
function compressImageToBlob(file, maxWidth = 1920) {
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
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.85);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ============= FIXED IMAGE UPLOAD =============
async function setupImageInput(inputId, isMultiple = false) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    
    newInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        const hiddenInput = document.getElementById(`hidden-${newInput.name}`);
        if (!hiddenInput) {
            console.error('Hidden input not found for:', newInput.name);
            showToast('Error: Hidden input not found.', 'error');
            return;
        }
        
        const uploadedUrls = [];
        showToast('Uploading image(s)...', 'info');
        
        for (const file of files) {
            try {
                if (file.size > 5 * 1024 * 1024) {
                    showToast('File too large. Please use images under 5MB.', 'error');
                    continue;
                }
                
                const compressedBlob = await compressImageToBlob(file, 1920);
                
                const formData = new FormData();
                formData.append('file', compressedBlob, file.name);
                
                const token = localStorage.getItem('ak_admin_token');
                if (!token) {
                    showToast('Please login again.', 'error');
                    return;
                }
                
                console.log('Uploading file:', file.name, 'Size:', compressedBlob.size);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);
                
                const response = await fetch(`${API_BASE}/api/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                const data = await response.json();
                console.log('Upload response:', data);
                
                if (!response.ok) {
                    throw new Error(data.message || `HTTP ${response.status}`);
                }
                
                if (data.success && data.url) {
                    uploadedUrls.push(data.url);
                } else {
                    showToast('Upload failed: ' + (data.message || 'Unknown error'), 'error');
                }
            } catch (err) {
                console.error('Upload error:', err);
                if (err.name === 'AbortError') {
                    showToast('Upload timeout. Please try again.', 'error');
                } else {
                    showToast('Upload error: ' + err.message, 'error');
                }
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
    if (adminDashboard) adminDashboard.style.display = 'flex';
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
    sidebarCollapsed = !sidebarCollapsed;
    if (window.innerWidth <= 1024) {
        sidebar.classList.toggle('open');
    } else {
        sidebar.classList.toggle('collapsed');
    }
    localStorage.setItem('ak_sidebar_collapsed', sidebarCollapsed ? 'true' : 'false');
}

function closeSidebar() {
    if (window.innerWidth <= 1024) {
        sidebar.classList.remove('open');
    }
}

function navigateTab(tab) {
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.tab === tab);
    });
    
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.toggle('active', el.id === `tab-${tab}`);
    });
    
    const statsSection = document.getElementById('dashboard-stats');
    if (statsSection) {
        statsSection.style.display = tab === 'dashboard' ? 'block' : 'none';
    }
    
    const titles = {
        dashboard: 'Dashboard',
        listings: 'Listings',
        offplan: 'Off-Plan Projects',
        communities: 'Communities',
        blog: 'Blog',
        leads: 'Leads',
        profile: 'Profile'
    };
    document.getElementById('page-title').textContent = titles[tab] || 'Dashboard';
    
    currentTab = tab;
    
    if (tab === 'leads') loadLeads();
    if (tab === 'listings') loadListings();
    if (tab === 'offplan') loadOffplan();
    if (tab === 'communities') loadCommunities();
    if (tab === 'blog') loadBlog();
    if (tab === 'profile') loadProfile();
    if (tab === 'dashboard') updateStats();
    
    closeSidebar();
}

window.navigateTab = navigateTab;

// ============= LOAD DATA FROM API =============

async function loadAllData() {
    await Promise.all([
        loadListings(),
        loadOffplan(),
        loadCommunities(),
        loadProfile(),
        loadLeads(),
        loadBlog()
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
            updateStats();
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
            updateStats();
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
            console.log('Loaded communities:', communitiesData);
            renderCommunitiesTable();
            updateSidebarBadges();
            updateStats();
        }
    } catch (error) {
        console.error('Error loading communities:', error);
        showError('communities-table-body', 'Failed to load communities');
    }
}

async function loadBlog() {
    try {
        const response = await fetch(`${API_BASE}/api/blog?t=${Date.now()}`);
        const data = await response.json();
        if (data.success) {
            blogData = data.posts;
            renderBlogTable();
            updateSidebarBadges();
            updateStats();
        }
    } catch (error) {
        console.error('Error loading blog:', error);
        showError('blog-table-body', 'Failed to load blog posts');
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
    document.getElementById('sidebar-listings-count').textContent = listingsData.length || 0;
    document.getElementById('sidebar-offplan-count').textContent = offplanData.length || 0;
    document.getElementById('sidebar-communities-count').textContent = communitiesData.length || 0;
    document.getElementById('sidebar-leads-count').textContent = leadsData.length || 0;
    const blogBadge = document.getElementById('sidebar-blog-count');
    if (blogBadge) blogBadge.textContent = blogData.length || 0;
}

// ============= RENDER TABLES =============

function renderListingsTable() {
    const tbody = document.getElementById('listings-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!listingsData || listingsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;font-family:Inter, sans-serif;">No listings found. Click "Add New Listing" to create one.</td></tr>';
        return;
    }
    
    listingsData.forEach(listing => {
        const tr = document.createElement('tr');
        const images = listing.images && typeof listing.images === 'string' ? listing.images.split(',') : (listing.images || []);
        const firstImage = Array.isArray(images) && images.length > 0 ? images[0] : 'https://placehold.co/60x60/0A1628/C9A84C?text=Property';
        
        tr.innerHTML = `
            <td><img src="${firstImage}" alt="${listing.title}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--line);"></td>
            <td><strong style="font-family:Plus Jakarta Sans, sans-serif;font-weight:600;letter-spacing:-0.02em;">${listing.title}</strong></td>
            <td style="font-family:Plus Jakarta Sans, sans-serif;font-weight:600;letter-spacing:-0.02em;">AED ${formatPrice(listing.price)}</td>
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
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;font-family:Inter, sans-serif;">No off-plan projects found. Click "Add New Project" to create one.</td></tr>';
        return;
    }
    
    offplanData.forEach(project => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="font-family:Plus Jakarta Sans, sans-serif;font-weight:600;letter-spacing:-0.02em;">${project.projectName}</strong></td>
            <td>${project.developer}</td>
            <td>${project.community}</td>
            <td style="font-family:Plus Jakarta Sans, sans-serif;font-weight:600;letter-spacing:-0.02em;">AED ${formatPrice(project.startingPrice)}</td>
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
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;font-family:Inter, sans-serif;">No communities found. Click "Add New Community" to create one.</td></tr>';
        return;
    }
    
    communitiesData.forEach(community => {
        const tr = document.createElement('tr');
        // Check both 'image' and 'images' fields
        const imageUrl = community.image || community.images || 'https://placehold.co/60x60/0A1628/C9A84C?text=Community';
        
        tr.innerHTML = `
            <td><img src="${imageUrl}" alt="${community.name}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--line);" onerror="this.onerror=null;this.src='https://placehold.co/60x60/0A1628/C9A84C?text=Community'"></td>
            <td><strong style="font-family:Plus Jakarta Sans, sans-serif;font-weight:600;letter-spacing:-0.02em;">${community.name}</strong></td>
            <td>${community.communityType || 'N/A'}</td>
            <td>${community.avgApartmentPrice || 'N/A'}</td>
            <td>${community.avgVillaPrice || 'N/A'}</td>
            <td>${community.popular ? '⭐' : ''}</td>
            <td class="actions">
                <button class="btn btn-primary btn-sm" onclick="window.editCommunity('${community.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="window.deleteCommunity('${community.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderBlogTable() {
    const tbody = document.getElementById('blog-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!blogData || blogData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;font-family:Inter, sans-serif;">No blog posts found. Click "Add New Post" to create one.</td></tr>';
        return;
    }
    
    blogData.forEach(post => {
        const tr = document.createElement('tr');
        const statusClass = post.status === 'published' ? 'published' : 'draft';
        const statusText = post.status === 'published' ? 'Published' : 'Draft';
        const imageUrl = post.featured_image || 'https://placehold.co/60x60/0A1628/C9A84C?text=Blog';
        
        tr.innerHTML = `
            <td><img src="${imageUrl}" alt="${post.title}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--line);"></td>
            <td><strong style="font-family:Plus Jakarta Sans, sans-serif;font-weight:600;letter-spacing:-0.02em;">${post.title}</strong></td>
            <td>${post.category || 'Uncategorized'}</td>
            <td><span class="table-status ${statusClass}">${statusText}</span></td>
            <td>${post.featured ? '⭐' : ''}</td>
            <td>${post.views || 0}</td>
            <td>${formatDate(post.published_at || post.created_at)}</td>
            <td class="actions">
                <button class="btn btn-primary btn-sm" onclick="window.editBlog('${post.id}')">Edit</button>
                ${post.status === 'draft' ? `<button class="btn btn-success btn-sm" onclick="window.publishBlog('${post.id}')">Publish</button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="window.deleteBlog('${post.id}')">Delete</button>
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
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;font-family:Inter, sans-serif;">No leads found.</td></tr>';
        return;
    }
    
    leadsData.forEach(lead => {
        const tr = document.createElement('tr');
        const statusClass = lead.contacted ? 'contacted' : 'new';
        const statusText = lead.contacted ? 'Contacted' : 'Pending';
        const leadId = lead.unique_id || lead.id;
        
        tr.innerHTML = `
            <td>${formatDate(lead.created_at || lead.createdAt)}</td>
            <td><strong style="font-family:Plus Jakarta Sans, sans-serif;font-weight:600;letter-spacing:-0.02em;">${lead.name || 'N/A'}</strong></td>
            <td>${lead.phone || 'N/A'}</td>
            <td>${lead.email || 'N/A'}</td>
            <td><span class="table-status ${lead.type || 'new'}">${lead.type || 'N/A'}</span></td>
            <td><button class="btn btn-secondary btn-sm" onclick="window.viewLeadDetails('${leadId}')">View</button></td>
            <td>${lead.phone ? `<a href="https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}" target="_blank" class="btn btn-success btn-sm">WhatsApp</a>` : 'N/A'}</td>
            <td>
                <span class="table-status ${statusClass}">${statusText}</span>
                ${!lead.contacted ? `<button class="btn btn-success btn-sm" onclick="window.markLeadContacted('${leadId}')" style="margin-top:4px;">Mark Contacted</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:#DC3545;font-family:Inter, sans-serif;">${message}</td></tr>`;
    }
}

// ============= STATS =============

function updateStats() {
    const activeListings = listingsData.filter(l => l.status === 'for-sale' || l.status === 'for-rent').length;
    document.getElementById('active-listings').textContent = activeListings;
    document.getElementById('offplan-count').textContent = offplanData.length;
    document.getElementById('communities-count').textContent = communitiesData.length;
    document.getElementById('blog-count').textContent = blogData.length || 0;
    document.getElementById('total-leads').textContent = leadsData.length || 0;
    
    if (leadsData.length > 0) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        document.getElementById('leads-today').textContent = leadsData.filter(l => new Date(l.created_at || l.createdAt) >= today).length;
    }
}

// ============= CRUD - LISTINGS =============

window.editListing = function(id) {
    const listing = listingsData.find(l => l.id == id);
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
    const project = offplanData.find(p => p.id == id);
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
    const community = communitiesData.find(c => c.id == id);
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
    // Get the image from hidden field
    const imageValue = formData.get('image_hidden') || '';
    console.log('Saving community with image:', imageValue);
    
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
        popular: formData.get('popular') === 'true',
        image: imageValue
    };
    
    Object.keys(community).forEach(key => { if (community[key] === undefined) community[key] = null; });
    
    console.log('Community data being saved:', community);
    
    try {
        const response = await fetch(`${API_BASE}/api/communities`, { 
            method: 'POST', 
            headers: getAuthHeaders(), 
            body: JSON.stringify(community) 
        });
        const data = await response.json();
        console.log('Save response:', data);
        
        if (data.success) {
            closeModal(); 
            await loadCommunities(); 
            updateStats(); 
            updateSidebarBadges();
            showToast('✅ Community saved successfully!', 'success');
            editingId = null; editingType = null;
        } else { 
            showToast('❌ Failed to save: ' + data.message, 'error'); 
        }
    } catch (error) { 
        console.error('Save error:', error); 
        showToast('❌ Error saving community.', 'error'); 
    }
}

function buildCommunityForm(community = null) {
    const safeJoin = (val) => Array.isArray(val) ? val.join(', ') : (typeof val === 'string' ? val : '');
    
    // Log the community data to debug
    console.log('Building community form with:', community);
    console.log('Community image:', community?.image);
    
    const fields = [
        { type: 'text', name: 'name', label: 'Name', value: community?.name || '' },
        { type: 'text', name: 'slug', label: 'Slug (URL)', value: community?.slug || '' },
        { type: 'file', name: 'image', label: 'Upload Community Image', value: community?.image || '', multiple: false },
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

// ============= CRUD - BLOG WITH QUILL =============

window.editBlog = function(id) {
    console.log('Edit blog called with ID:', id);
    console.log('Current blogData:', blogData);
    
    let post = blogData.find(p => p.id == id);
    if (!post) {
        post = blogData.find(p => String(p.id) === String(id));
    }
    
    if (!post) {
        showToast('Blog post not found. Please refresh and try again.', 'error');
        console.error('Post not found for ID:', id);
        return;
    }
    
    console.log('Found post:', post);
    editingId = id;
    editingType = 'blog';
    openModal('Edit Blog Post', buildBlogForm(post));
};

window.deleteBlog = async function(id) {
    if (!confirm('Are you sure you want to delete this blog post?')) return;
    try {
        const response = await fetch(`${API_BASE}/api/blog/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            await loadBlog(); updateStats(); updateSidebarBadges();
            showToast('Blog post deleted successfully!', 'success');
        } else { showToast('Failed to delete: ' + data.message, 'error'); }
    } catch (error) { console.error('Delete error:', error); showToast('Error deleting blog post.', 'error'); }
};

window.publishBlog = async function(id) {
    if (!confirm('Publish this blog post?')) return;
    try {
        const response = await fetch(`${API_BASE}/api/blog/${id}/publish`, { method: 'PUT', headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            const post = blogData.find(p => p.id == id);
            if (post) {
                post.status = 'published';
                post.published_at = new Date().toISOString();
            }
            renderBlogTable();
            updateStats();
            updateSidebarBadges();
            showToast('✅ Blog post published successfully!', 'success');
            await loadBlog();
        } else { showToast('Failed to publish: ' + data.message, 'error'); }
    } catch (error) { console.error('Publish error:', error); showToast('Error publishing blog post.', 'error'); }
};

async function saveBlog(formData) {
    let content = '';
    if (quillEditor && quillInitialized) {
        content = quillEditor.root.innerHTML;
    } else {
        content = formData.get('content') || '';
    }
    
    const status = formData.get('status') || 'draft';
    const isPublishing = status === 'published';
    
    const post = {
        id: editingId || null,
        title: formData.get('title') || '',
        slug: formData.get('slug') || (formData.get('title') || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        excerpt: formData.get('excerpt') || '',
        content: content,
        featured_image: formData.get('featured_image_hidden') || '',
        author: formData.get('author') || 'Admin',
        category: formData.get('category') || '',
        tags: formData.get('tags') || '',
        status: status,
        featured: formData.get('featured') === 'true'
    };
    
    Object.keys(post).forEach(key => { 
        if (post[key] === undefined || post[key] === null) {
            post[key] = ''; 
        }
    });
    
    const saveBtn = document.getElementById('modal-save');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = isPublishing ? 'Publishing...' : 'Saving...';
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/blog`, { 
            method: 'POST', 
            headers: getAuthHeaders(), 
            body: JSON.stringify(post) 
        });
        
        const data = await response.json();
        
        if (data.success) {
            cleanupQuill();
            
            if (editingId) {
                const existingPost = blogData.find(p => p.id == editingId);
                if (existingPost) {
                    Object.assign(existingPost, post);
                    if (isPublishing) {
                        existingPost.status = 'published';
                        existingPost.published_at = new Date().toISOString();
                    }
                }
            } else {
                const newPost = {
                    ...post,
                    id: Date.now(),
                    created_at: new Date().toISOString(),
                    views: 0
                };
                blogData.unshift(newPost);
            }
            
            renderBlogTable();
            updateStats();
            updateSidebarBadges();
            closeModal();
            
            const message = isPublishing ? '✅ Blog post published successfully!' : '✅ Blog post saved as draft!';
            showToast(message, 'success');
            
            editingId = null; 
            editingType = null;
            
            await loadBlog();
        } else { 
            showToast('❌ Failed to save: ' + (data.message || 'Unknown error'), 'error'); 
        }
    } catch (error) { 
        console.error('Save error:', error); 
        showToast('❌ Error saving blog post: ' + error.message, 'error'); 
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = isPublishing ? 'Publish' : 'Save as Draft';
        }
    }
}

function buildBlogForm(post = null) {
    const contentValue = post?.content || '';
    const statusValue = post?.status || 'draft';
    
    console.log('Building blog form with post:', post);
    
    const fields = [
        { type: 'text', name: 'title', label: 'Title', value: post?.title || '' },
        { type: 'text', name: 'slug', label: 'Slug (URL)', value: post?.slug || '' },
        { type: 'text', name: 'category', label: 'Category', value: post?.category || '' },
        { type: 'text', name: 'tags', label: 'Tags (comma separated)', value: post?.tags || '' },
        { type: 'textarea', name: 'excerpt', label: 'Excerpt (Short Summary)', value: post?.excerpt || '', rows: 3 },
        { type: 'quill', name: 'content', label: 'Content (Full Blog Post)', value: contentValue },
        { type: 'file', name: 'featured_image', label: 'Featured Image', value: post?.featured_image || '', multiple: false },
        { type: 'text', name: 'author', label: 'Author', value: post?.author || 'Admin' },
        { type: 'select', name: 'status', label: 'Status', value: statusValue, options: ['draft', 'published'] },
        { type: 'checkbox', name: 'featured', label: 'Featured Post', value: post?.featured || false }
    ];
    return buildFormHTML('blog-form', fields, true);
}

// ============= HELPER FOR FORM HTML =============

function buildFormHTML(formId, fields, isBlogForm = false) {
    let html = `<form id="${formId}">`;
    
    fields.forEach(f => {
        html += `<div class="form-group">`;
        html += `<label for="edit-${f.name}" style="font-family:Inter, sans-serif;font-weight:600;letter-spacing:0.08em;">${f.label}</label>`;
        
        if (f.type === 'select') {
            html += `<select id="edit-${f.name}" name="${f.name}" style="font-family:Inter, sans-serif;">`;
            f.options.forEach(opt => { html += `<option value="${opt}" ${f.value === opt ? 'selected' : ''}>${opt}</option>`; });
            html += `</select>`;
        } else if (f.type === 'textarea') {
            html += `<textarea id="edit-${f.name}" name="${f.name}" rows="${f.rows || 3}" style="font-family:Inter, sans-serif;">${f.value || ''}</textarea>`;
        } else if (f.type === 'checkbox') {
            html += `<input type="checkbox" id="edit-${f.name}" name="${f.name}" value="true" ${f.value ? 'checked' : ''}>`;
        } else if (f.type === 'file') {
            // For file inputs, use the field name directly
            const fieldName = f.name;
            html += `<input type="file" id="edit-${fieldName}" name="${fieldName}" accept="image/*" ${f.multiple ? 'multiple' : ''} style="font-family:Inter, sans-serif;">`;
            html += `<input type="hidden" id="hidden-${fieldName}" name="${fieldName}_hidden" value="${f.value || ''}">`;
            if (f.value) {
                html += `<div style="margin-top:8px;">`;
                html += `<img src="${f.value}" alt="Current image" style="max-width:150px;max-height:150px;object-fit:cover;border-radius:8px;border:1px solid var(--line);">`;
                html += `<small style="display:block;margin-top:4px;color:var(--dark-grey);font-family:Inter, sans-serif;">Current image will be kept unless you upload a new one.</small>`;
                html += `</div>`;
            }
        } else if (f.type === 'quill') {
            html += `<div id="quill-editor-container" style="min-height:300px;background:var(--white);border-radius:var(--radius-sm);border:1px solid var(--line);"></div>`;
            html += `<input type="hidden" id="edit-${f.name}" name="${f.name}" value="${f.value || ''}">`;
        } else {
            html += `<input type="${f.type}" id="edit-${f.name}" name="${f.name}" value="${f.value || ''}" style="font-family:Inter, sans-serif;">`;
        }
        html += `</div>`;
    });
    html += '</form>';
    
    return html;
}

// ============= QUILL EDITOR FUNCTIONS =============

function cleanupQuill() {
    try {
        if (quillEditor) {
            if (typeof quillEditor.destroy === 'function') {
                quillEditor.destroy();
            }
            const container = document.getElementById('quill-editor-container');
            if (container) {
                container.innerHTML = '';
            }
        }
    } catch (e) {
        console.log('Quill cleanup warning:', e.message);
    }
    quillEditor = null;
    quillInitialized = false;
}

function initializeQuill(content) {
    cleanupQuill();
    
    const container = document.getElementById('quill-editor-container');
    if (!container) {
        console.log('Quill container not found');
        return;
    }
    
    if (typeof Quill === 'undefined') {
        console.error('Quill library not loaded');
        showToast('Editor not loaded. Please refresh.', 'error');
        return;
    }
    
    const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'header': 1 }, { 'header': 2 }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'font': [] }],
        [{ 'align': [] }],
        ['clean'],
        ['link', 'image', 'video']
    ];
    
    try {
        quillEditor = new Quill(container, {
            theme: 'snow',
            modules: {
                toolbar: toolbarOptions
            },
            placeholder: 'Write your blog post content here...'
        });
        
        if (content) {
            quillEditor.root.innerHTML = content;
        }
        
        quillInitialized = true;
        
        quillEditor.on('text-change', function() {
            const hiddenInput = document.getElementById('edit-content');
            if (hiddenInput) {
                hiddenInput.value = quillEditor.root.innerHTML;
            }
        });
    } catch (e) {
        console.error('Error initializing Quill:', e);
        showToast('Error loading editor. Please refresh and try again.', 'error');
    }
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

// ============= LEAD MANAGEMENT =============

window.viewLeadDetails = function(id) {
    const lead = leadsData.find(l => l.unique_id === id || l.id === id);
    if (!lead) {
        showToast('Lead not found.', 'error');
        return;
    }
    
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');
    
    modalTitle.textContent = `Lead Details`;
    modalFooter.style.display = 'none';
    
    const formatLabel = (val) => val ? val : 'N/A';
    
    const fieldLabels = {
        name: 'Full Name',
        phone: 'Phone',
        email: 'Email',
        created_at: 'Received',
        createdAt: 'Received',
        type: 'Lead Type',
        contacted: 'Status',
        propertyType: 'Property Type',
        community: 'Community',
        bedrooms: 'Bedrooms',
        size: 'Size (sqft)',
        yearBuilt: 'Year Built',
        address: 'Address',
        features: 'Features',
        subject: 'Subject',
        message: 'Message',
        property: 'Property',
        date: 'Preferred Date',
        time: 'Preferred Time',
        budget: 'Budget Range',
        site_id: 'Site ID'
    };
    
    const mainFields = ['name', 'phone', 'email', 'created_at', 'createdAt', 'type', 'contacted'];
    let mainInfoHtml = '';
    const mainData = {};
    
    mainFields.forEach(key => {
        if (lead[key] !== undefined && lead[key] !== null && lead[key] !== '') {
            let value = lead[key];
            if (key === 'contacted') {
                value = value ? 'Contacted ✅' : 'Pending ⏳';
            } else if (key === 'type') {
                const typeLabels = {
                    'contact': '📋 Contact',
                    'valuation': '📊 Valuation',
                    'viewing': '👁️ Viewing',
                    'goldenvisa': '🏆 Golden Visa'
                };
                value = typeLabels[value] || value;
            } else if (key === 'created_at' || key === 'createdAt') {
                value = formatDate(value);
            }
            const label = fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            mainData[label] = value;
        }
    });
    
    if (Object.keys(mainData).length > 0) {
        mainInfoHtml = `
            <div class="lead-info-grid">
                ${Object.entries(mainData).map(([label, value]) => `
                    <div class="lead-info-item">
                        <div class="lead-info-icon">${getIconForField(label)}</div>
                        <div class="lead-info-content">
                            <span class="lead-info-label" style="font-family:Inter, sans-serif;font-weight:600;letter-spacing:0.04em;">${label}</span>
                            <span class="lead-info-value" style="font-family:Inter, sans-serif;font-weight:500;">${value}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    const extraFields = ['propertyType', 'community', 'bedrooms', 'size', 'yearBuilt', 'address', 'features', 'subject', 'message', 'property', 'date', 'time', 'budget'];
    let extraDetailsHtml = '';
    let hasExtra = false;
    const extraData = {};
    
    extraFields.forEach(key => {
        if (lead[key] !== undefined && lead[key] !== null && lead[key] !== '') {
            const label = fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            extraData[label] = lead[key];
            hasExtra = true;
        }
    });
    
    if (hasExtra) {
        extraDetailsHtml = `
            <div class="lead-extra-section">
                <h4 class="lead-extra-title" style="font-family:Inter, sans-serif;font-weight:600;letter-spacing:0.02em;">📋 Submitted Details</h4>
                <div class="lead-extra-grid">
                    ${Object.entries(extraData).map(([label, value]) => `
                        <div class="lead-extra-item">
                            <span class="lead-extra-label" style="font-family:Inter, sans-serif;font-weight:600;letter-spacing:0.04em;">${label}</span>
                            <span class="lead-extra-value" style="font-family:Inter, sans-serif;font-weight:500;">${value}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    const leadId = lead.unique_id || lead.id;
    
    modalBody.innerHTML = `
        <div class="lead-detail-container">
            <div class="lead-detail-header">
                <div class="lead-avatar" style="font-family:Plus Jakarta Sans, sans-serif;font-weight:800;letter-spacing:-0.02em;">${lead.name ? lead.name.charAt(0).toUpperCase() : '?'}</div>
                <div class="lead-header-info">
                    <h3 class="lead-header-name" style="font-family:Inter, sans-serif;font-weight:600;">${formatLabel(lead.name)}</h3>
                    <span class="lead-type-badge ${lead.type || 'general'}" style="font-family:Inter, sans-serif;font-weight:600;letter-spacing:0.04em;">${lead.type || 'General'}</span>
                </div>
            </div>
            
            ${mainInfoHtml}
            ${extraDetailsHtml}
            
            <div class="lead-detail-footer">
                ${!lead.contacted ? `<button class="btn btn-success" onclick="window.markLeadContacted('${leadId}')" style="font-family:Inter, sans-serif;font-weight:600;letter-spacing:0.02em;">✅ Mark as Contacted</button>` : ''}
                ${lead.phone ? `<a href="https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}" target="_blank" class="btn btn-whatsapp" style="font-family:Inter, sans-serif;font-weight:600;letter-spacing:0.02em;">💬 WhatsApp</a>` : ''}
                <button class="btn btn-secondary" onclick="window.closeModal()" style="font-family:Inter, sans-serif;font-weight:600;letter-spacing:0.02em;">Close</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
};

function getIconForField(label) {
    const iconMap = {
        'Full Name': '👤',
        'Phone': '📞',
        'Email': '✉️',
        'Received': '📅',
        'Status': '🔄',
        'Lead Type': '📌'
    };
    return iconMap[label] || '📄';
}

window.markLeadContacted = async function(id) {
    const lead = leadsData.find(l => l.unique_id === id || l.id === id);
    if (!lead) {
        showToast('Lead not found.', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('ak_admin_token');
        if (!token) {
            showToast('Please login again.', 'error');
            return;
        }
        
        const sourceTable = lead.source_table || getSourceTableForLead(lead);
        const originalId = lead.original_id || lead.id;
        
        const response = await fetch(`${API_BASE}/admin/leads/${originalId}/contacted`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                contacted: 1,
                source_table: sourceTable,
                original_id: originalId
            })
        });
        
        const data = await response.json();
        
        lead.contacted = 1;
        renderLeadsTable();
        updateStats();
        updateSidebarBadges();
        closeModal();
        
        if (data.success) {
            showToast('✅ Lead marked as contacted successfully!', 'success');
        } else {
            showToast('⚠️ Status updated in UI. Syncing with server...', 'warning');
        }
        
        await loadLeads();
        
    } catch (error) {
        console.error('Error marking lead as contacted:', error);
        lead.contacted = 1;
        renderLeadsTable();
        updateStats();
        updateSidebarBadges();
        closeModal();
        showToast('⚠️ Status updated locally. Will sync with server.', 'warning');
        try {
            await loadLeads();
        } catch (e) {
            console.error('Background refresh failed:', e);
        }
    }
};

function getSourceTableForLead(lead) {
    if (!lead || !lead.type) return 'contacts';
    const typeMap = {
        'contact': 'contacts',
        'valuation': 'valuations',
        'viewing': 'viewings',
        'goldenvisa': 'goldenvisa_leads'
    };
    return typeMap[lead.type] || 'contacts';
}

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
    
    if (editingType === 'blog') {
        const saveBtn = document.getElementById('modal-save');
        const statusSelect = document.getElementById('edit-status');
        if (saveBtn) {
            const isPublished = statusSelect && statusSelect.value === 'published';
            saveBtn.textContent = isPublished ? 'Publish' : 'Save as Draft';
        }
        setTimeout(() => {
            const statusSelect = document.getElementById('edit-status');
            if (statusSelect) {
                statusSelect.addEventListener('change', function() {
                    const saveBtn = document.getElementById('modal-save');
                    if (saveBtn) {
                        saveBtn.textContent = this.value === 'published' ? 'Publish' : 'Save as Draft';
                    }
                });
            }
        }, 100);
    }
    
    // Setup image inputs - IMPORTANT: For communities, the input name is 'image'
    setTimeout(() => {
        setupImageInput('edit-images', true);  // For listings
        setupImageInput('edit-image', false);  // For offplan and communities
        setupImageInput('edit-featured_image', false); // For blog
        // Also try with 'edit-image' for communities specifically
        const communityImageInput = document.getElementById('edit-image');
        if (communityImageInput) {
            setupImageInput('edit-image', false);
        }
    }, 100);
    
    if (editingType === 'blog') {
        setTimeout(() => {
            const container = document.getElementById('quill-editor-container');
            const hiddenInput = document.getElementById('edit-content');
            if (container && hiddenInput) {
                const content = hiddenInput.value || '';
                initializeQuill(content);
            }
        }, 300);
    }
    
    document.getElementById('modal-save').onclick = function() {
        const form = document.querySelector('#modal-body form');
        if (!form) { showToast('Form not found', 'error'); return; }
        const formData = new FormData(form);
        if (editingType === 'listing') saveListing(formData);
        else if (editingType === 'offplan') saveOffplan(formData);
        else if (editingType === 'community') saveCommunity(formData);
        else if (editingType === 'blog') saveBlog(formData);
    };
}

window.closeModal = function() {
    cleanupQuill();
    document.getElementById('modal').style.display = 'none';
    editingId = null; 
    editingType = null;
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
    
    const collapsed = localStorage.getItem('ak_sidebar_collapsed') === 'true';
    if (collapsed && window.innerWidth > 1024) {
        sidebar.classList.add('collapsed');
        sidebarCollapsed = true;
    }
    
    if (loginForm) loginForm.addEventListener('submit', async function(e) { e.preventDefault(); await login(document.getElementById('admin-password').value); });
    if (loginBtn) loginBtn.addEventListener('click', async function(e) { e.preventDefault(); await login(document.getElementById('admin-password').value); });
    if (passwordInput) passwordInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') { e.preventDefault(); loginForm.dispatchEvent(new Event('submit')); } });
    
    document.querySelectorAll('#logout-btn, #logout-btn-sidebar').forEach(btn => {
        btn.addEventListener('click', function(e) { e.preventDefault(); if (confirm('Are you sure you want to logout?')) logout(); });
    });
    
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tab = this.dataset.tab;
            if (tab) navigateTab(tab);
        });
    });
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 1024 && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                closeSidebar();
            }
        }
    });
    
    document.getElementById('add-listing-btn')?.addEventListener('click', () => { editingId = null; editingType = 'listing'; openModal('Add New Listing', buildListingForm()); });
    document.getElementById('add-offplan-btn')?.addEventListener('click', () => { editingId = null; editingType = 'offplan'; openModal('Add New Off-Plan Project', buildOffplanForm()); });
    document.getElementById('add-community-btn')?.addEventListener('click', () => { editingId = null; editingType = 'community'; openModal('Add New Community', buildCommunityForm()); });
    document.getElementById('add-blog-btn')?.addEventListener('click', () => { editingId = null; editingType = 'blog'; openModal('Add New Blog Post', buildBlogForm()); });
    
    document.getElementById('profile-form')?.addEventListener('submit', function(e) { e.preventDefault(); saveProfile(new FormData(this)); });
    
    document.getElementById('filter-leads-btn')?.addEventListener('click', filterLeads);
    document.getElementById('export-leads-btn')?.addEventListener('click', exportCSV);
    
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('modal')?.addEventListener('click', function(e) { if (e.target === this) closeModal(); });
    
    setInterval(() => { if (currentUser && currentTab === 'leads') { loadLeads(); } }, 30000);
    setInterval(() => { if (currentUser && currentTab === 'dashboard') { updateStats(); } }, 30000);
    
    navigateTab('dashboard');
});
