// API Configuration
const API_KEY = 'AIzaSyDAE_mLGJM2NhTVaGuYOhYl6YfG6Cxsi18';
const RPM_RATES = {
    'US': 7.53,   // United States
    'GB': 5.62,   // United Kingdom
    'NZ': 5.56,   // New Zealand
    'AE': 2.33,   // United Arab Emirates
    'PK': 2.5,    // Pakistan
    'IN': 2.5,    // India
    'DEFAULT': 2.5 // Default rate for other countries
};

// DOM Elements
const channelInput = document.getElementById('channelInput');
const searchBtn = document.getElementById('searchBtn');
const analyticsSection = document.getElementById('analyticsSection');
const chartsSection = document.getElementById('chartsSection');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');

// Event Listeners
searchBtn.addEventListener('click', fetchChannelData);
channelInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') fetchChannelData();
});

// Main Function to Fetch Channel Data
async function fetchChannelData() {
    const input = channelInput.value.trim();
    if (!input) {
        showError('Please enter a YouTube channel name or URL');
        return;
    }

    try {
        showLoading();
        clearError();
        
        let channelId;
        if (isYouTubeUrl(input)) {
            channelId = await extractChannelIdFromUrl(input);
        } else {
            channelId = await searchChannelByName(input);
        }

        if (!channelId) {
            throw new Error('Channel not found. Please check the name or URL and try again.');
        }

        const channelData = await getChannelDetails(channelId);
        displayChannelAnalytics(channelData);
        initializeCharts(channelData);
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'An error occurred while fetching channel data. Please try again.');
    } finally {
        hideLoading();
    }
}

// Helper Functions
function isYouTubeUrl(input) {
    return input.includes('youtube.com') || input.includes('youtu.be');
}

async function extractChannelIdFromUrl(url) {
    try {
        // Handle various YouTube URL formats
        if (url.includes('/channel/')) {
            return url.split('/channel/')[1].split(/[\/?]/)[0];
        } else if (url.includes('/c/') || url.includes('/user/')) {
            const username = url.split('/')[4].split(/[\/?]/)[0];
            return await searchChannelByName(username);
        } else if (url.includes('youtu.be')) {
            // For video URLs, we'd need to get the channel ID from video details
            throw new Error('Please enter a channel URL, not a video URL');
        }
        throw new Error('Invalid YouTube URL format');
    } catch (error) {
        throw new Error('Could not extract channel ID from URL. Please check the URL format.');
    }
}

async function searchChannelByName(query) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=1&key=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            throw new Error('No channels found with that name. Please try a different search.');
        }
        
        return data.items[0].id.channelId;
    } catch (error) {
        throw new Error(`Error searching for channel: ${error.message}`);
    }
}

async function getChannelDetails(channelId) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,status,brandingSettings,contentDetails&id=${channelId}&key=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            throw new Error('Channel details not found. The channel may be private or deleted.');
        }
        
        return data.items[0];
    } catch (error) {
        throw new Error(`Error fetching channel details: ${error.message}`);
    }
}

function displayChannelAnalytics(channelData) {
    const { snippet, statistics, status, brandingSettings, contentDetails } = channelData;
    const countryCode = snippet.country || 'DEFAULT';
    const rpm = RPM_RATES[countryCode] || RPM_RATES.DEFAULT;
    const revenue = calculateRevenue(statistics.viewCount, rpm);
    
    // Format numbers with commas
    const formatNumber = num => num ? Number(num).toLocaleString() : 'N/A';
    
    // Create profile picture HTML if available
    const profilePicHtml = snippet.thumbnails?.high?.url ? 
        `<img src="${snippet.thumbnails.high.url}" alt="Profile Picture" class="profile-pic">` : 
        '<p>No profile picture available</p>';
    
    // Create related playlists HTML if available
    let playlistsHtml = 'N/A';
    if (contentDetails?.relatedPlaylists) {
        playlistsHtml = Object.entries(contentDetails.relatedPlaylists)
            .map(([key, value]) => `<div><strong>${key}:</strong> ${value}</div>`)
            .join('');
    }
    
    // Create keywords HTML if available
    let keywordsHtml = 'N/A';
    if (brandingSettings?.channel?.keywords) {
        keywordsHtml = brandingSettings.channel.keywords.split('"')
            .filter(word => word.trim().length > 0 && word !== ' ')
            .map(word => `<span class="keyword-tag">${word.trim()}</span>`)
            .join(' ');
    }
    
    // Create the analytics HTML
    analyticsSection.innerHTML = `
        <div class="metric-card" style="grid-column: span 2; text-align: center;">
            ${profilePicHtml}
            <h3>${snippet.title || 'N/A'}</h3>
            <p>${snippet.description || 'No description available'}</p>
        </div>
        
        <div class="metric-card">
            <h3>Channel ID</h3>
            <p>${channelData.id || 'N/A'}</p>
        </div>
        
        <div class="metric-card">
            <h3>Custom URL</h3>
            <p>${snippet.customUrl ? `youtube.com/${snippet.customUrl}` : 'N/A'}</p>
        </div>
        
        <div class="metric-card">
            <h3>Subscribers</h3>
            <p>${formatNumber(statistics.subscriberCount)}</p>
        </div>
        
        <div class="metric-card">
            <h3>Total Views</h3>
            <p>${formatNumber(statistics.viewCount)}</p>
        </div>
        
        <div class="metric-card">
            <h3>Video Count</h3>
            <p>${formatNumber(statistics.videoCount)}</p>
        </div>
        
        <div class="metric-card">
            <h3>Created Date</h3>
            <p>${new Date(snippet.publishedAt).toLocaleDateString()}</p>
        </div>
        
        <div class="metric-card">
            <h3>Country</h3>
            <p>${snippet.country || 'N/A'}</p>
        </div>
        
        <div class="metric-card">
            <h3>Status</h3>
            <p>${status.privacyStatus === 'public' ? 'Public' : 'Private'}</p>
            <p>${status.isLinked ? 'Verified' : 'Not Verified'}</p>
        </div>
        
        <div class="metric-card">
            <h3>Related Playlists</h3>
            <div class="playlists">${playlistsHtml}</div>
        </div>
        
        <div class="metric-card">
            <h3>Keywords</h3>
            <div class="keywords">${keywordsHtml}</div>
        </div>
        
        <div class="revenue-card">
            <h2>Estimated Total Revenue</h2>
            <p>$${revenue.toLocaleString()}</p>
            <p style="font-size: 1rem; margin-top: 0.5rem;">
                Based on ${formatNumber(statistics.viewCount)} views from ${snippet.country || 'unknown country'} (RPM: $${rpm})
            </p>
        </div>
    `;
}

function calculateRevenue(views, rpm) {
    return Math.round((views * rpm) / 1000);
}

function initializeCharts(channelData) {
    // Clear previous charts
    chartsSection.innerHTML = '';
    
    // Create chart containers
    const charts = [
        { id: 'subscriberChart', type: 'line', title: 'Subscriber Growth', data: generateRandomData(12, 10000, 50000) },
        { id: 'videoChart', type: 'bar', title: 'Video Uploads', data: generateRandomData(12, 5, 30) },
        { id: 'viewsChart', type: 'pie', title: 'Views Over Time', data: generateRandomData(5, 1000, 10000) },
        { id: 'revenueChart', type: 'doughnut', title: 'Revenue Trends', data: generateRandomData(4, 1000, 5000) },
        { id: 'engagementChart', type: 'radar', title: 'Engagement Metrics', data: generateRandomData(6, 20, 100) },
        { id: 'demographicsChart', type: 'polarArea', title: 'Audience Demographics', data: generateRandomData(5, 10, 40) }
    ];
    
    // Create chart elements
    charts.forEach(chart => {
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        chartContainer.innerHTML = `
            <h3 class="chart-title">${chart.title}</h3>
            <canvas id="${chart.id}"></canvas>
        `;
        chartsSection.appendChild(chartContainer);
        
        // Initialize chart
        createChart(chart.id, chart.type, chart.title, chart.data);
    });
}

function createChart(id, type, title, data) {
    const ctx = document.getElementById(id).getContext('2d');
    const labels = Array.from({ length: data.length }, (_, i) => {
        if (type === 'pie' || type === 'doughnut' || type === 'polarArea') {
            return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i];
        }
        return `Month ${i + 1}`;
    });
    
    const backgroundColors = [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(199, 199, 199, 0.7)',
        'rgba(83, 102, 255, 0.7)',
        'rgba(255, 99, 255, 0.7)',
        'rgba(99, 255, 132, 0.7)'
    ];
    
    new Chart(ctx, {
        type: type,
        data: {
            labels: labels.slice(0, data.length),
            datasets: [{
                label: title,
                data: data,
                backgroundColor: backgroundColors.slice(0, data.length),
                borderColor: backgroundColors.map(c => c.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: type === 'radar' ? {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0
                }
            } : {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function generateRandomData(count, min, max) {
    return Array.from({ length: count }, () => 
        Math.floor(Math.random() * (max - min + 1)) + min
    );
}

function showLoading() {
    loadingIndicator.style.display = 'block';
    analyticsSection.innerHTML = '';
    chartsSection.innerHTML = '';
}

function hideLoading() {
    loadingIndicator.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function clearError() {
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
}