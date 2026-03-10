// Gelgrems — index.js// Client-side demo product grid + cart. No build step required.

// Product catalog (small demo). Images live in the PRODUCTS/ folder.
const PRODUCTS = [
	{ id: 'chinchin', name: 'Chin Chin', price: 2.5, category: 'Snacks', img: 'PRODUCTS/Chin Chin.png' },
	{ id: 'chops', name: 'Chops', price: 3.0, category: 'Savory', img: 'PRODUCTS/Chops.png' },
	{ id: 'donuts', name: 'Donuts', price: 1.75, category: 'Dessert', img: 'PRODUCTS/Donuts.png' },
	{ id: 'eggroll', name: 'Egg roll', price: 2.0, category: 'Savory', img: 'PRODUCTS/Egg roll.png' },
	{ id: 'meatpie', name: 'Meat-pie', price: 2.25, category: 'Savory', img: 'PRODUCTS/MEAT-PIE.png' },
	
]

// fallback placeholder (tiny SVG data URL) used when product image fails to load
const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
	`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
		<rect width="100%" height="100%" fill="#f4f4f4"/>
		<g fill="#ddd" transform="translate(120 70)">
			<rect x="0" y="0" width="160" height="120" rx="10"/>
			<text x="80" y="65" font-size="14" text-anchor="middle" fill="#bbb" font-family="Arial,Segoe UI,Helvetica">No image</text>
		</g>
	</svg>`
);

// State
let state = {
	query: '',
	category: 'all',
	cart: loadCart()
};

// Elements
const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const cartToggle = document.getElementById('cartToggle');
const cartCount = document.getElementById('cartCount');
const cartPanel = document.getElementById('cartPanel');
const overlay = document.getElementById('overlay');
const closeCartBtn = document.getElementById('closeCart');
const cartItemsList = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');

// modal elements (in-page dialog)
const modalEl = document.getElementById('modal');
const modalTitleEl = document.getElementById('modalTitle');
const modalMessageEl = document.getElementById('modalMessage');
const modalConfirmBtn = document.getElementById('modalConfirm');
const modalCancelBtn = document.getElementById('modalCancel');

init();

function init() {
	populateCategories();
	renderProducts();
	renderCart();
	attachListeners();
}

// Modal helper: show/hide with callbacks
let _modalKeyHandler = null;
function showModal({ title = '', message = '', primaryText = 'OK', cancelText = 'Cancel', hideCancel = false, onConfirm = null, onCancel = null } = {}) {
	if (!modalEl) return;
	modalTitleEl.textContent = title;
	modalMessageEl.textContent = message;
	modalConfirmBtn.textContent = primaryText;
	modalCancelBtn.textContent = cancelText;
	modalEl.hidden = false;
	modalEl.setAttribute('aria-hidden', 'false');
	modalCancelBtn.style.display = hideCancel ? 'none' : '';

	// cleanup previous handlers
	modalConfirmBtn.onclick = null;
	modalCancelBtn.onclick = null;

	modalConfirmBtn.onclick = () => {
		hideModal();
		if (typeof onConfirm === 'function') onConfirm();
	};
	modalCancelBtn.onclick = () => {
		hideModal();
		if (typeof onCancel === 'function') onCancel();
	};

	// keyboard: Escape to cancel
	_modalKeyHandler = (e) => {
		if (e.key === 'Escape') {
			modalCancelBtn.onclick();
		}
	};
	document.addEventListener('keydown', _modalKeyHandler);
	// focus primary button for keyboard users
	modalConfirmBtn.focus();
}

function hideModal() {
	if (!modalEl) return;
	modalEl.hidden = true;
	modalEl.setAttribute('aria-hidden', 'true');
	modalConfirmBtn.onclick = null;
	modalCancelBtn.onclick = null;
	if (_modalKeyHandler) {
		document.removeEventListener('keydown', _modalKeyHandler);
		_modalKeyHandler = null;
	}
}

function populateCategories() {
	const cats = Array.from(new Set(PRODUCTS.map(p => p.category))).sort();
	cats.forEach(cat => {
		const opt = document.createElement('option');
		opt.value = cat;
		opt.textContent = cat;
		categoryFilter.appendChild(opt);
	});
}

function attachListeners() {
	searchInput.addEventListener('input', (e) => {
		state.query = e.target.value.trim().toLowerCase();
		renderProducts();
	});

	categoryFilter.addEventListener('change', (e) => {
		state.category = e.target.value;
		renderProducts();
	});

	cartToggle.addEventListener('click', () => openCart());
	closeCartBtn.addEventListener('click', () => closeCart());
	overlay.addEventListener('click', () => closeCart());

	checkoutBtn.addEventListener('click', () => {
		if (!modalEl) {
			// fallback to alert/confirm if modal is not present
			if (Object.keys(state.cart).length === 0) {
				alert('Your cart is empty');
				return;
			}
			const total = calculateTotal();
			if (confirm(`Order total ${formatMoney(total)}\nProceed to checkout?`)) {
				state.cart = {};
				saveCart();
				renderCart();
				closeCart();
				alert('Thanks — your demo order is placed!');
			}
			return;
		}

		if (Object.keys(state.cart).length === 0) {
			showModal({ title: 'Cart', message: 'Your cart is empty.', primaryText: 'OK', hideCancel: true });
			return;
		}

		const total = calculateTotal();
		showModal({
			title: 'Confirm order',
			message: `Order total ${formatMoney(total)}`,
			primaryText: 'Confirm',
			cancelText: 'Cancel',
			onConfirm: () => {
				state.cart = {};
				saveCart();
				renderCart();
				closeCart();
				showModal({ title: 'Order placed', message: 'Thanks — your demo order is placed!', primaryText: 'OK', hideCancel: true });
			}
		});
	});

	// keyboard: escape to close cart
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && cartPanel.classList.contains('open')) closeCart();
	});
}

function renderProducts() {
	productsGrid.innerHTML = '';
	const filtered = PRODUCTS.filter(p => {
		const matchQuery = p.name.toLowerCase().includes(state.query);
		const matchCat = state.category === 'all' ? true : p.category === state.category;
		return matchQuery && matchCat;
	});

	if (filtered.length === 0) {
		const el = document.createElement('div');
		el.className = 'empty';
		el.textContent = 'No products match your search.';
		productsGrid.appendChild(el);
		return;
	}

	filtered.forEach(product => productsGrid.appendChild(productCard(product)));
}

function productCard(product) {
	const card = document.createElement('article');
	card.className = 'product-card';

		const img = document.createElement('img');
		img.className = 'product-image';
		img.alt = product.name;
		// lazy-load and fallback handler
		img.loading = 'lazy';
		img.src = encodeURI(product.img);
		img.onerror = () => {
			img.onerror = null;
			img.src = PLACEHOLDER_IMG;
		};

	const body = document.createElement('div');
	body.className = 'product-body';

	const title = document.createElement('h4');
	title.textContent = product.name;

	const cat = document.createElement('div');
	cat.className = 'product-cat';
	cat.textContent = product.category;

	const price = document.createElement('div');
	price.className = 'product-price';
	price.textContent = formatMoney(product.price);

	const actions = document.createElement('div');
	actions.className = 'product-actions';
	const addBtn = document.createElement('button');
	addBtn.className = 'add-btn';
	addBtn.textContent = 'Add to cart';
	addBtn.addEventListener('click', () => addToCart(product.id));

	actions.appendChild(addBtn);

	body.appendChild(title);
	body.appendChild(cat);
	body.appendChild(price);
	body.appendChild(actions);

	card.appendChild(img);
	card.appendChild(body);
	return card;
}

// --- Cart logic ---
function addToCart(productId) {
	// add one of the product to the cart
	state.cart[productId] = (state.cart[productId] || 0) + 1;
	saveCart();
	renderCart();
	// visual feedback on the cart button
	if (cartToggle) {
		cartToggle.classList.add('bump');
		setTimeout(() => cartToggle.classList.remove('bump'), 300);
	}
}

function removeFromCart(productId) {
	delete state.cart[productId];
	saveCart();
	renderCart();
}

function updateQuantity(productId, qty) {
	if (qty <= 0) {
		removeFromCart(productId);
		return;
	}
	state.cart[productId] = qty;
	saveCart();
	renderCart();
}

function renderCart() {
	// count
	const itemCount = Object.values(state.cart).reduce((s, v) => s + v, 0);
	cartCount.textContent = itemCount;

	cartItemsList.innerHTML = '';
	if (itemCount === 0) {
		const li = document.createElement('li');
		li.className = 'cart-empty';
		li.textContent = 'Your cart is empty.';
		cartItemsList.appendChild(li);
		cartTotalEl.textContent = formatMoney(0);
		return;
	}

	for (const [productId, qty] of Object.entries(state.cart)) {
		const product = PRODUCTS.find(p => p.id === productId);
		if (!product) continue;
		const li = document.createElement('li');
		li.className = 'cart-item';

		// thumbnail
		const thumb = document.createElement('img');
		thumb.className = 'cart-thumb';
		thumb.alt = product.name;
		thumb.src = encodeURI(product.img);
		thumb.loading = 'lazy';
		thumb.onerror = () => { thumb.onerror = null; thumb.src = PLACEHOLDER_IMG; };

		const name = document.createElement('div');
		name.className = 'cart-item-name';
		name.textContent = product.name;

		// quantity controls: minus, numeric input, plus
		const qtyWrap = document.createElement('div');
		qtyWrap.className = 'cart-item-qty';

		const minusBtn = document.createElement('button');
		minusBtn.textContent = '-';
		minusBtn.setAttribute('aria-label', `Decrease quantity for ${product.name}`);
		minusBtn.addEventListener('click', () => updateQuantity(productId, qty - 1));

		const qtyInput = document.createElement('input');
		qtyInput.type = 'number';
		qtyInput.min = '1';
		qtyInput.value = qty;
		qtyInput.className = 'qty-input';
		// accessibility: label the input for screen readers with product name
		qtyInput.setAttribute('aria-label', `Quantity for ${product.name}`);
		qtyInput.addEventListener('change', () => {
			const v = parseInt(qtyInput.value, 10) || 0;
			updateQuantity(productId, v);
		});

		const plusBtn = document.createElement('button');
		plusBtn.textContent = '+';
		plusBtn.setAttribute('aria-label', `Increase quantity for ${product.name}`);
		plusBtn.addEventListener('click', () => updateQuantity(productId, qty + 1));

		qtyWrap.appendChild(minusBtn);
		qtyWrap.appendChild(qtyInput);
		qtyWrap.appendChild(plusBtn);

		const price = document.createElement('div');
		price.className = 'cart-item-price';
		price.textContent = formatMoney(product.price * qty);

		const remove = document.createElement('button');
		remove.className = 'cart-item-remove';
		remove.textContent = 'Remove';
		remove.setAttribute('aria-label', `Remove ${product.name} from cart`);
		remove.addEventListener('click', () => removeFromCart(productId));

		li.appendChild(thumb);
		li.appendChild(name);
		li.appendChild(qtyWrap);
		li.appendChild(price);
		li.appendChild(remove);
		cartItemsList.appendChild(li);
	}

	cartTotalEl.textContent = formatMoney(calculateTotal());
}

function calculateTotal() {
	let total = 0;
	for (const [id, qty] of Object.entries(state.cart)) {
		const p = PRODUCTS.find(x => x.id === id);
		if (p) total += p.price * qty;
	}
	return total;
}

function openCart() {
	cartPanel.classList.add('open');
	cartPanel.setAttribute('aria-hidden', 'false');
	overlay.hidden = false;
	overlay.classList.add('visible');
}

function closeCart() {
	cartPanel.classList.remove('open');
	cartPanel.setAttribute('aria-hidden', 'true');
	overlay.classList.remove('visible');
	overlay.hidden = true;
}

function saveCart() {
	try {
		localStorage.setItem('gelgrems_cart_v1', JSON.stringify(state.cart));
	} catch (e) {
		console.warn('Could not save cart', e);
	}
}

function loadCart() {
	try {
		const raw = localStorage.getItem('gelgrems_cart_v1');
		if (!raw) return {};
		return JSON.parse(raw);
	} catch (e) {
		return {};
	}
}

function formatMoney(n) {
	return '$' + n.toFixed(2);
}

// Expose some functions for debugging in the demo
window._gelgrems = { PRODUCTS, state };

