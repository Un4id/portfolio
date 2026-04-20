// ─── Estado inicial ───────────────────────────────────────────
let products = JSON.parse(localStorage.getItem('vault_products') || 'null') || [
  { id: 1, name: 'Auriculares Pro X', price: 199.99, category: 'tech', stock: 12, desc: 'Sonido envolvente con cancelación activa de ruido', emoji: '🎧' },
  { id: 2, name: 'Teclado Mecánico', price: 129.00, category: 'tech', stock: 5, desc: 'Switches Cherry MX, retroiluminación RGB', emoji: '⌨️' },
  { id: 3, name: 'Monitor 27" 4K', price: 449.00, category: 'tech', stock: 3, desc: 'Panel IPS, 144Hz, HDR600', emoji: '🖥️' },
  { id: 4, name: 'Lámpara de escritorio', price: 49.99, category: 'home', stock: 20, desc: 'LED regulable, temperatura ajustable', emoji: '💡' },
  { id: 5, name: 'Silla ergonómica', price: 349.00, category: 'home', stock: 7, desc: 'Soporte lumbar, reposabrazos ajustables', emoji: '🪑' },
  { id: 6, name: 'Planta de interior', price: 24.99, category: 'home', stock: 30, desc: 'Fácil cuidado, purifica el aire', emoji: '🌿' },
  { id: 7, name: 'Camiseta Premium', price: 39.00, category: 'fashion', stock: 50, desc: '100% algodón orgánico, varios colores', emoji: '👕' },
  { id: 8, name: 'Mochila urbana', price: 89.99, category: 'fashion', stock: 15, desc: 'Compartimento laptop 15", impermeable', emoji: '🎒' },
  { id: 9, name: 'Zapatillas Running', price: 119.00, category: 'fashion', stock: 0, desc: 'Suela amortiguadora, transpirable', emoji: '👟' },
];

let cart = JSON.parse(localStorage.getItem('vault_cart') || '[]');
let priceMax = 500;

const saveProducts = () => localStorage.setItem('vault_products', JSON.stringify(products));
const saveCart = () => localStorage.setItem('vault_cart', JSON.stringify(cart));
const uid = () => Math.max(0, ...products.map(p => p.id)) + 1;

// ─── PÁGINA ───────────────────────────────────────────────────
function showPage(page) {
  document.getElementById('page-shop').style.display = page === 'shop' ? 'block' : 'none';
  document.getElementById('page-admin').style.display = page === 'admin' ? 'block' : 'none';
  document.getElementById('nav-shop').classList.toggle('active', page === 'shop');
  document.getElementById('nav-admin').classList.toggle('active', page === 'admin');
  if (page === 'admin') renderAdmin();
}

// ─── SHOP ─────────────────────────────────────────────────────
function filterProducts() {
  const search = document.getElementById('product-search').value.toLowerCase();
  const checkedCats = [...document.querySelectorAll('.filter-item input:checked')].map(i => i.value);
  const includeAll = checkedCats.includes('all');
  const sort = document.getElementById('sort-select').value;

  let filtered = products.filter(p => {
    const matchCat = includeAll || checkedCats.includes(p.category);
    const matchSearch = p.name.toLowerCase().includes(search) || p.desc.toLowerCase().includes(search);
    const matchPrice = p.price <= priceMax;
    return matchCat && matchSearch && matchPrice;
  });

  if (sort === 'price-asc') filtered.sort((a,b) => a.price - b.price);
  else if (sort === 'price-desc') filtered.sort((a,b) => b.price - a.price);
  else if (sort === 'name') filtered.sort((a,b) => a.name.localeCompare(b.name));

  renderProducts(filtered);
}

function updatePriceFilter(val) {
  priceMax = Number(val);
  document.getElementById('price-label').textContent = val;
  filterProducts();
}

function renderProducts(list) {
  const grid = document.getElementById('product-grid');
  const BADGE = { tech: 'badge-tech', home: 'badge-home', fashion: 'badge-fashion' };
  const CAT_LABELS = { tech: 'Tech', home: 'Hogar', fashion: 'Moda' };

  grid.innerHTML = list.map((p, i) => `
    <div class="product-card" style="animation-delay:${i*0.04}s">
      <div class="product-image">${p.emoji}</div>
      <div class="product-info">
        <div class="product-footer" style="margin-bottom:6px">
          <span class="product-name">${escHtml(p.name)}</span>
          <span class="product-badge ${BADGE[p.category]}">${CAT_LABELS[p.category]}</span>
        </div>
        <p class="product-desc">${escHtml(p.desc)}</p>
        <div class="product-footer">
          <span class="product-price">${p.price.toFixed(2)}€</span>
          <span style="font-size:12px;color:${p.stock > 0 ? 'var(--green)' : 'var(--red)'}">
            ${p.stock > 0 ? `${p.stock} en stock` : 'Agotado'}
          </span>
        </div>
        <button class="btn-add-cart" onclick="addToCart(${p.id})" ${p.stock === 0 ? 'disabled' : ''}>
          ${p.stock === 0 ? 'Sin stock' : 'Añadir al carrito'}
        </button>
      </div>
    </div>
  `).join('');

  if (!list.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;padding:4rem;text-align:center;color:var(--muted);font-size:15px">
      No se encontraron productos
    </div>`;
  }
}

// ─── CARRITO ──────────────────────────────────────────────────
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product || product.stock === 0) return;

  const existing = cart.find(i => i.id === productId);
  if (existing) {
    if (existing.qty >= product.stock) { showToast('No hay más stock disponible'); return; }
    existing.qty++;
  } else {
    cart.push({ id: productId, qty: 1 });
  }
  saveCart();
  updateCartBadge();
  showToast(`${product.emoji} ${product.name} añadido`);
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCart();
  updateCartBadge();
  renderCart();
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) { removeFromCart(productId); return; }
  const product = products.find(p => p.id === productId);
  if (product && item.qty > product.stock) item.qty = product.stock;
  saveCart();
  updateCartBadge();
  renderCart();
}

function updateCartBadge() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById('cart-badge');
  badge.textContent = total;
  badge.style.display = total > 0 ? 'flex' : 'none';
}

function openCart() {
  document.getElementById('cart-overlay').classList.add('open');
  document.getElementById('cart-panel').classList.add('open');
  renderCart();
}

function closeCart() {
  document.getElementById('cart-overlay').classList.remove('open');
  document.getElementById('cart-panel').classList.remove('open');
}

function renderCart() {
  const itemsEl = document.getElementById('cart-items');
  const emptyEl = document.getElementById('cart-empty');
  const footerEl = document.getElementById('cart-footer');

  if (!cart.length) {
    itemsEl.style.display = 'none';
    emptyEl.style.display = 'flex';
    footerEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  itemsEl.style.display = 'flex';
  footerEl.style.display = 'block';

  let total = 0;
  itemsEl.innerHTML = cart.map(item => {
    const p = products.find(p => p.id === item.id);
    if (!p) return '';
    total += p.price * item.qty;
    return `
      <div class="cart-item">
        <span class="cart-item-emoji">${p.emoji}</span>
        <div class="cart-item-info">
          <div class="cart-item-name">${escHtml(p.name)}</div>
          <div class="cart-item-price">${(p.price * item.qty).toFixed(2)}€</div>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="changeQty(${p.id}, -1)">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${p.id}, 1)">+</button>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('cart-total-price').textContent = total.toFixed(2) + '€';
}

function checkout() {
  cart = [];
  saveCart();
  updateCartBadge();
  closeCart();
  showToast('🎉 Pedido realizado con éxito (demo)');
  filterProducts();
}

// ─── ADMIN ────────────────────────────────────────────────────
function renderAdmin() {
  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const revenue = products.reduce((s, p) => s + p.price * Math.floor(Math.random() * 5 + 1), 0);
  document.getElementById('stat-products').textContent = products.length;
  document.getElementById('stat-orders').textContent = Math.floor(Math.random() * 20 + 10);
  document.getElementById('stat-revenue').textContent = revenue.toFixed(0) + '€';
  document.getElementById('stat-stock').textContent = totalStock;

  const tbody = document.getElementById('admin-tbody');
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><span style="margin-right:8px">${p.emoji}</span>${escHtml(p.name)}</td>
      <td><span style="text-transform:capitalize">${p.category}</span></td>
      <td>${p.price.toFixed(2)}€</td>
      <td class="${p.stock <= 3 ? 'stock-low' : 'stock-ok'}">${p.stock} uds${p.stock === 0 ? ' ⚠️' : ''}</td>
      <td style="display:flex;gap:6px">
        <button class="btn-edit" onclick="openProductModal(${p.id})">Editar</button>
        <button class="btn-delete" onclick="deleteProduct(${p.id})">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function openProductModal(id = null) {
  const modal = document.getElementById('product-modal-overlay');
  if (id) {
    const p = products.find(p => p.id === id);
    if (!p) return;
    document.getElementById('product-modal-title').textContent = 'Editar producto';
    document.getElementById('edit-product-id').value = id;
    document.getElementById('edit-name').value = p.name;
    document.getElementById('edit-price').value = p.price;
    document.getElementById('edit-category').value = p.category;
    document.getElementById('edit-stock').value = p.stock;
    document.getElementById('edit-desc').value = p.desc;
    document.getElementById('edit-emoji').value = p.emoji;
  } else {
    document.getElementById('product-modal-title').textContent = 'Nuevo producto';
    document.getElementById('edit-product-id').value = '';
    document.getElementById('edit-name').value = '';
    document.getElementById('edit-price').value = '';
    document.getElementById('edit-category').value = 'tech';
    document.getElementById('edit-stock').value = '10';
    document.getElementById('edit-desc').value = '';
    document.getElementById('edit-emoji').value = '📦';
  }
  modal.classList.add('open');
}

function closeProductModal() {
  document.getElementById('product-modal-overlay').classList.remove('open');
}

function saveProduct() {
  const id = document.getElementById('edit-product-id').value;
  const name = document.getElementById('edit-name').value.trim();
  const price = parseFloat(document.getElementById('edit-price').value);
  if (!name || isNaN(price)) { showToast('Completa todos los campos'); return; }

  const data = {
    name,
    price,
    category: document.getElementById('edit-category').value,
    stock: parseInt(document.getElementById('edit-stock').value) || 0,
    desc: document.getElementById('edit-desc').value.trim(),
    emoji: document.getElementById('edit-emoji').value.trim() || '📦'
  };

  if (id) {
    const idx = products.findIndex(p => p.id === parseInt(id));
    products[idx] = { ...products[idx], ...data };
  } else {
    products.push({ id: uid(), ...data });
  }

  saveProducts();
  closeProductModal();
  renderAdmin();
  showToast(id ? 'Producto actualizado' : 'Producto creado');
}

function deleteProduct(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  products = products.filter(p => p.id !== id);
  cart = cart.filter(i => i.id !== id);
  saveProducts(); saveCart(); updateCartBadge();
  renderAdmin();
  showToast('Producto eliminado');
}

// ─── TOAST ────────────────────────────────────────────────────
let toastTimeout;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('show'), 2500);
}

// ─── Utils ────────────────────────────────────────────────────
function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ─── Init ─────────────────────────────────────────────────────
document.getElementById('cart-btn').addEventListener('click', openCart);
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeCart(); closeProductModal(); } });

updateCartBadge();
filterProducts();
