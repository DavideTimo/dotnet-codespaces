// MB Group - Site JavaScript

// Navbar scroll effect
window.addEventListener('scroll', function () {
    const navbar = document.getElementById('mainNav');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.style.boxShadow = '0 4px 30px rgba(0,0,0,0.25)';
        } else {
            navbar.style.boxShadow = '0 2px 20px rgba(0,0,0,0.15)';
        }
    }
});

// Sidebar toggle for internal pages
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

// Close sidebar when clicking outside (mobile)
document.addEventListener('click', function (e) {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.querySelector('.sidebar-toggle-btn');
    if (sidebar && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !toggleBtn?.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href').substring(1);
        const target = document.getElementById(targetId);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// News ticker duplicate for seamless loop
window.addEventListener('DOMContentLoaded', () => {
    const ticker = document.querySelector('.ticker-content');
    if (ticker) {
        ticker.innerHTML += ticker.innerHTML;
    }
});
