const adsLoader = document.getElementById('ads-loader');
const adsContent = document.getElementById('ads-content');

// --- User Profile Fetching ---
async function fetchAndDisplayUser() {
    const loader = document.getElementById('profile-loader');
    const content = document.getElementById('profile-content');
    const userNameEl = document.getElementById('user-name');
    const userPicEl = document.getElementById('user-pic');

    try {
        const response = await fetch('/api/user/me');
        if (!response.ok) throw new Error('Could not fetch user data.');
        const user = await response.json();

        userNameEl.textContent = `Welcome, ${user.name}`;
        userPicEl.src = user.picture;
    } catch (error) {
        console.error('Error fetching user data:', error);
        userNameEl.textContent = 'Welcome!';
    } finally {
        // Hide loader and show content
        loader.classList.add('hidden');
        content.classList.remove('hidden');
    }
}

// --- Google Ads Logic ---
async function fetchAndDisplayAdsData() {
    try {
        const res = await fetch('/api/ads/accounts');
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || res.statusText);
        }
        const data = await res.json();

        if (data.needs_auth) {
            adsContent.innerHTML = `
                <p>Please connect your Google Ads account to view campaigns.</p>
                <a href="/api/auth/google-ads/connect" class="button-primary">Connect Google Ads</a>
            `;
        } else if (data.accounts && data.accounts.length > 0) {
            let options = data.accounts.map(acc => `<option value="${acc.id}">${acc.descriptive_name} (${acc.id})${acc.is_manager ? ' (Manager)' : ''}</option>`).join('');
            adsContent.innerHTML = `
                <label for="ads-account-select">Select an Ads Account:</label>
                <select id="ads-account-select">
                    <option value="">--Please choose an account--</option>
                    ${options}
                </select>
                <div id="breadcrumbs" class="breadcrumbs"></div>
                <input type="text" id="campaign-search" class="search-input hidden" placeholder="Filter by name..." onkeyup="filterCampaigns()">
                <div id="campaigns-container"></div>
                <div id="pagination-controls" class="pagination hidden">
                    <button id="prev-page" onclick="changePage(-1)">Previous</button>
                    <span id="page-info"></span>
                    <button id="next-page" onclick="changePage(1)">Next</button>
                </div>
            `;
            document.getElementById('ads-account-select').onchange = (e) => handleRootSelection(e.target.value, e.target.options[e.target.selectedIndex].text);
        } else {
            adsContent.innerHTML = '<p>No accessible Google Ads accounts found.</p>';
        }
    } catch (error) {
        console.error('Error fetching ads accounts:', error);
        adsContent.innerHTML = `<p style="color: #de350b;">An error occurred: ${error.message}</p>`;
    } finally {
        adsLoader.classList.add('hidden');
        adsContent.classList.remove('hidden');
    }
}

let breadcrumbs = [];

function renderBreadcrumbs() {
    const container = document.getElementById('breadcrumbs');
    if (breadcrumbs.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    const html = breadcrumbs.map((crumb, index) => {
        if (index === breadcrumbs.length - 1) {
            return `<span class="breadcrumb-current">${crumb.name}</span>`;
        }
        return `<span class="breadcrumb-item" onclick="handleBreadcrumbClick(${index})">${crumb.name}</span><span class="breadcrumb-separator">/</span>`;
    }).join('');
    
    container.innerHTML = html;
}

function handleBreadcrumbClick(index) {
    const target = breadcrumbs[index];
    breadcrumbs = breadcrumbs.slice(0, index + 1);
    renderBreadcrumbs();
    loadAccountCampaigns(target.id);
}

function handleRootSelection(id, name) {
    if (!id) {
        breadcrumbs = [];
        renderBreadcrumbs();
        loadAccountCampaigns('');
        return;
    }
    breadcrumbs = [{ id, name }];
    renderBreadcrumbs();
    loadAccountCampaigns(id);
}

function handleDrillDown(id, name) {
    breadcrumbs.push({ id, name });
    renderBreadcrumbs();
    loadAccountCampaigns(id);
}

let allCampaigns = [];
let filteredCampaigns = [];
let currentPage = 1;
const itemsPerPage = 10;

function renderCampaigns() {
    const campaignsContainer = document.getElementById('campaigns-container');
    const paginationControls = document.getElementById('pagination-controls');
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (filteredCampaigns.length === 0) {
        campaignsContainer.innerHTML = '<p style="margin-top: 20px;">No campaigns found.</p>';
        if (paginationControls) paginationControls.classList.add('hidden');
        return;
    }

    const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
    
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredCampaigns.length);
    const pageItems = filteredCampaigns.slice(startIndex, endIndex);

    const campaignItems = pageItems.map(c => {
        if (c.status === 'Client Account') {
            const safeName = c.name.replace(/'/g, "\\'");
            return `
                <li onclick="handleDrillDown('${c.id}', '${safeName}')" style="cursor: pointer; border-left: 4px solid #0052cc;">
                    <span style="flex: 2; font-weight: 500; color: #0052cc;">${c.name}</span>
                    <span style="flex: 1;">${c.status}</span>
                    <span style="flex: 1; text-align: right;">View Campaigns &rarr;</span>
                    <span style="flex: 1; text-align: right;"></span>
                </li>`;
        }
        return `
            <li>
                <span style="flex: 2; font-weight: 500;">${c.name}</span>
                <span style="flex: 1;">${c.status}</span>
                <span style="flex: 1; text-align: right;">${c.clicks} Clicks</span>
                <span style="flex: 1; text-align: right;">${c.impressions} Impr.</span>
            </li>`;
    }).join('');
    
    campaignsContainer.innerHTML = `<ul class="campaign-list">${campaignItems}</ul>`;

    if (totalPages > 1) {
        paginationControls.classList.remove('hidden');
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    } else {
        paginationControls.classList.add('hidden');
    }
}

function changePage(delta) {
    currentPage += delta;
    renderCampaigns();
}

function filterCampaigns() {
    const input = document.getElementById('campaign-search');
    const filter = input.value.toLowerCase();
    
    filteredCampaigns = allCampaigns.filter(c => c.name.toLowerCase().includes(filter));
    currentPage = 1;
    renderCampaigns();
}

async function loadAccountCampaigns(customerId) {
    const campaignsContainer = document.getElementById('campaigns-container');
    const searchInput = document.getElementById('campaign-search');
    const paginationControls = document.getElementById('pagination-controls');

    if (!customerId) {
        campaignsContainer.innerHTML = '';
        if (searchInput) searchInput.classList.add('hidden');
        if (paginationControls) paginationControls.classList.add('hidden');
        return;
    }

    if (searchInput) searchInput.classList.add('hidden');
    if (paginationControls) paginationControls.classList.add('hidden');
    campaignsContainer.innerHTML = '<div class="spinner" style="margin-top: 20px;"></div>'; // Show a spinner

    try {
        const res = await fetch(`/api/ads/campaigns/${customerId}`);
        const data = await res.json();

        if (data.campaigns && data.campaigns.length > 0) {
            if (searchInput) {
                searchInput.value = ''; // Clear previous search
                searchInput.classList.remove('hidden');
            }
            allCampaigns = data.campaigns;
            filteredCampaigns = data.campaigns;
            currentPage = 1;
            renderCampaigns();
        } else {
            allCampaigns = [];
            filteredCampaigns = [];
            campaignsContainer.innerHTML = '<p style="margin-top: 20px;">No Campaigns Created Yet.</p>';
        }
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        campaignsContainer.innerHTML = '<p style="margin-top: 20px;">An error occurred while fetching campaigns.</p>';
    }
}

// --- Window Onload ---
window.onload = function () {
    fetchAndDisplayUser();
    fetchAndDisplayAdsData();

    document.getElementById('signout-button').onclick = async function() {
        await fetch('/api/auth/logout', { method: 'POST' });
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            google.accounts.id.disableAutoSelect();
        }
        window.location.href = '/';
    };
};