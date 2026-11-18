'use strict';
/* ====== VPHONE web - giao diện chạy trên Chrome, gọi API JSON của máy chủ Java (Web.java) ====== */

const $ = (s, r = document) => r.querySelector(s);
const vnd = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' ₫';
const TT = { CHO_XAC_NHAN: 'Chờ xác nhận', DANG_GIAO: 'Đang giao', HOAN_THANH: 'Hoàn thành', DA_HUY: 'Đã hủy' };
const TT_TIEP = { CHO_XAC_NHAN: ['DANG_GIAO', 'DA_HUY'], DANG_GIAO: ['HOAN_THANH'], HOAN_THANH: [], DA_HUY: [] };

/** Tạo phần tử DOM an toàn (dùng textContent, không chèn HTML => không bị XSS). */
function el(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'style') e.style.cssText = v;
    else if (k in e) e[k] = v;
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
}

const S = { user: null, token: sessionStorage.getItem('token'), view: 'sanpham', info: null, cart: 0,
            f: { q: '', min: '', max: '', sort: '' }, theme: localStorage.getItem('theme') === 'dark' ? 'dark' : 'light' };
document.documentElement.dataset.theme = S.theme;
const laQuanTri = () => S.user && S.user.vaiTro === 'QUAN_TRI';
const laKhach = () => S.user && S.user.vaiTro === 'KHACH_HANG';

async function api(method, url, body) {
  const res = await fetch('/api/' + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(S.token ? { 'X-Token': S.token } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.loi || ('Lỗi ' + res.status));
    e.loai = data.loai; e.status = res.status;
    throw e;
  }
  return data;
}

function toast(msg, kind = 'ok', sub) {
  const t = el('div', { class: 'toast' + (kind === 'err' ? ' err' : ''), title: 'Bấm để đóng', onclick: () => t.remove() }, el('b', { text: msg }), sub ? el('div', { class: 'sub', text: sub }) : null);
  $('#toasts').append(t);
  setTimeout(() => t.remove(), kind === 'err' ? 6500 : 3200);
}

/** Chạy một thao tác, lỗi nào cũng hiện thông báo thay vì làm hỏng giao diện. */
async function thuc(fn) {
  try { return await fn(); }
  catch (e) {
    toast(e.message, 'err', e.loai);
    if (e.status === 401 && S.user) { dangXuatCucBo(); }
  }
}

// ------------------------------------------------------------------ khung trang
function veKhung() {
  const nav = $('#nav'); nav.replaceChildren();
  const tabs = [['sanpham', 'Sản phẩm']];
  if (laKhach()) tabs.push(['gio', 'Giỏ hàng'], ['donhang', 'Đơn hàng của tôi']);
  if (laQuanTri()) tabs.push(['donhang', 'Đơn hàng'], ['nhaphang', 'Nhập hàng'], ['thongke', 'Thống kê'], ['nguoidung', 'Người dùng']);
  for (const [v, ten] of tabs) {
    nav.append(el('button', { class: S.view === v ? 'active' : '', onclick: () => di(v) }, ten,
      v === 'gio' && S.cart > 0 ? el('span', { class: 'badge-n', text: S.cart }) : null));
  }
  const ub = $('#userbox'); ub.replaceChildren();
  ub.append(el('button', { class: 'btn btn-sm btn-ghost-light', title: 'Chuyển chế độ sáng/tối', 'aria-label': 'Chuyển chế độ sáng/tối', onclick: () => {
    S.theme = S.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = S.theme; localStorage.setItem('theme', S.theme); veKhung();
  } }, S.theme === 'dark' ? '☀ Chế độ sáng' : '☾ Chế độ tối'));
  if (S.user) {
    ub.append(el('span', { text: S.user.hoTen }), el('span', { class: 'role-chip', text: laQuanTri() ? 'Quản trị viên' : 'Khách hàng' }),
      el('button', { class: 'btn btn-sm btn-ghost-light', onclick: dangXuat }, 'Đăng xuất'));
  } else {
    ub.append(el('button', { class: 'btn btn-sm btn-ghost-light', onclick: () => hopDangNhap('login') }, 'Đăng nhập / Đăng ký'));
  }
  const ft = $('#footer'); ft.replaceChildren();
  if (S.info) ft.append(el('span', { class: 'dot' + (S.info.cheDo === 'Oracle' ? '' : ' mem') }),
    `Dữ liệu: ${S.info.cheDo}. `, el('span', { class: 'muted', text: S.info.csdl }), ' · VPHONE - Bài tập lớn Công nghệ Java');
}

async function di(view) {
  S.view = view;
  veKhung();
  const main = $('#main');
  main.replaceChildren(el('div', { class: 'empty', text: 'Đang tải...' }));
  const v = VIEWS[view];
  await thuc(async () => { main.replaceChildren(await v()); });
}

async function capNhatGio() {
  if (!laKhach()) { S.cart = 0; return; }
  try { S.cart = (await api('GET', 'gio')).soLuong; } catch (e) { S.cart = 0; }
  veKhung();
}

function dangXuatCucBo() {
  S.user = null; S.token = null; S.cart = 0; sessionStorage.removeItem('token');
  di('sanpham');
}
async function dangXuat() {
  try { await api('POST', 'logout', {}); } catch (e) { /* bỏ qua */ }
  dangXuatCucBo();
  toast('Đã đăng xuất');
}

// ------------------------------------------------------------------ hộp thoại và biểu mẫu
let dongHienTai = null;
function dongHop() {
  $('#modal').classList.add('hidden'); $('#modal').replaceChildren();
  if (dongHienTai) { const fn = dongHienTai; dongHienTai = null; fn(); }
}
function moHop(tieuDe, noiDung, hanhDong) {
  const m = $('#modal');
  const box = el('div', { class: 'modal-box', role: 'dialog', 'aria-modal': 'true', 'aria-label': tieuDe }, el('h3', { text: tieuDe }), noiDung,
    hanhDong ? el('div', { class: 'modal-actions' }, hanhDong) : null);
  m.replaceChildren(box); m.classList.remove('hidden');
  m.onclick = (e) => { if (e.target === m) dongHop(); };
  box.querySelector('input, button, select')?.focus();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').classList.contains('hidden')) dongHop(); });

function xacNhan(tieuDe, noiDung, nhan = 'Xóa') {
  return new Promise(resolve => {
    dongHienTai = () => resolve(false);
    moHop(tieuDe, el('p', { class: 'muted', text: noiDung }), [
      el('button', { class: 'btn', onclick: dongHop }, 'Hủy'),
      el('button', { class: 'btn btn-danger', onclick: () => { dongHienTai = null; dongHop(); resolve(true); } }, nhan)]);
  });
}

function truong(nhan, input, cls) {
  const err = el('span', { class: 'field-error', 'aria-live': 'polite' });
  input._error = err;
  input.addEventListener('input', () => baoLoi(input, ''));
  return el('label', { class: 'f' + (cls ? ' ' + cls : '') }, nhan, input, err);
}
function baoLoi(input, msg) {
  if (!input._error) return;
  input._error.textContent = msg;
  input.classList.toggle('invalid', !!msg);
  input.setAttribute('aria-invalid', String(!!msg));
}
function kiemTra(fields, rules) {
  let first = null;
  for (const [k, check] of Object.entries(rules)) {
    const msg = check(fields[k].value.trim());
    baoLoi(fields[k], msg);
    if (msg && !first) first = fields[k];
  }
  first?.focus();
  return !first;
}
const batBuoc = v => v ? '' : 'Vui lòng nhập thông tin này.';
const soDuong = v => !v ? 'Vui lòng nhập giá.' : !Number.isFinite(Number(v)) || Number(v) <= 0 ? 'Giá phải lớn hơn 0.' : '';
const soNguyen = (v, min = 0) => v === '' ? 'Vui lòng nhập số lượng.' : !Number.isSafeInteger(Number(v)) || Number(v) < min ? `Nhập số nguyên từ ${min} trở lên.` : '';
const soDienThoai = v => v && !/^[0-9+().\s-]{9,20}$/.test(v) ? 'Số điện thoại không hợp lệ (9–20 ký tự).' : '';
const anhHopLe = v => v && !/^(https?:\/\/|\/)[^\s]*$/i.test(v) ? 'Dùng đường dẫn /... hoặc URL http(s).' : '';
async function luuForm(fn, fields, mapErrors = {}) {
  try { await fn(); }
  catch (e) {
    const key = Object.keys(mapErrors).find(k => e.message.toLowerCase().includes(k));
    if (key) { baoLoi(fields[mapErrors[key]], e.message); fields[mapErrors[key]].focus(); }
    else toast(e.message, 'err', e.loai);
    if (e.status === 401 && S.user) dangXuatCucBo();
  }
}

function hopDangNhap(tab) {
  const body = el('div');
  const ve = (t) => {
    body.replaceChildren();
    body.append(el('div', { class: 'tabs' },
      el('button', { class: t === 'login' ? 'on' : '', onclick: () => ve('login') }, 'Đăng nhập'),
      el('button', { class: t === 'reg' ? 'on' : '', onclick: () => ve('reg') }, 'Đăng ký khách hàng')));
    if (t === 'login') {
      const email = el('input', { type: 'email', placeholder: 'email@vphone.vn', autocomplete: 'username' });
      const mk = el('input', { type: 'password', placeholder: 'Mật khẩu', autocomplete: 'current-password' });
      const gui = async () => {
        const f = { email, matKhau: mk };
        if (!kiemTra(f, { email: v => !/^\S+@\S+\.\S+$/.test(v) ? 'Nhập email hợp lệ.' : '', matKhau: batBuoc })) return;
        await luuForm(async () => {
          const u = await api('POST', 'login', { email: email.value, matKhau: mk.value });
          S.token = u.token; S.user = u; sessionStorage.setItem('token', u.token);
          dongHop(); toast('Xin chào ' + u.hoTen);
          await capNhatGio(); await di(laQuanTri() ? 'thongke' : 'sanpham');
        }, f);
      };
      mk.addEventListener('keydown', (e) => { if (e.key === 'Enter') gui(); });
      body.append(el('div', { class: 'demo-hint' }, 'Tài khoản mẫu: ',
        el('a', { onclick: () => { email.value = 'khach@vphone.vn'; mk.value = '123456'; } }, 'Khách hàng'),
        el('a', { onclick: () => { email.value = 'admin@vphone.vn'; mk.value = 'admin123'; } }, 'Quản trị viên')),
        el('div', { class: 'form-grid' }, truong('Email', email, 'span2'), truong('Mật khẩu', mk, 'span2')),
        el('div', { class: 'modal-actions' }, el('button', { class: 'btn', onclick: dongHop }, 'Đóng'),
          el('button', { class: 'btn btn-primary', onclick: gui }, 'Đăng nhập')));
    } else {
      const f = { hoTen: el('input'), email: el('input', { type: 'email' }), matKhau: el('input', { type: 'password' }),
                  soDienThoai: el('input'), diaChi: el('input') };
      const gui = () => {
        if (!kiemTra(f, { hoTen: batBuoc, email: v => !/^\S+@\S+\.\S+$/.test(v) ? 'Nhập email hợp lệ.' : '', matKhau: batBuoc, soDienThoai })) return;
        luuForm(async () => {
          const d = {}; for (const k in f) d[k] = f[k].value;
          const u = await api('POST', 'register', d);
          toast('Đăng ký thành công, mã khách hàng: ' + u.ma); ve('login');
        }, f, { email: 'email', 'điện thoại': 'soDienThoai' });
      };
      body.append(el('div', { class: 'form-grid' }, truong('Họ tên', f.hoTen, 'span2'), truong('Email', f.email), truong('Mật khẩu', f.matKhau),
        truong('Số điện thoại', f.soDienThoai), truong('Địa chỉ', f.diaChi)),
        el('div', { class: 'modal-actions' }, el('button', { class: 'btn', onclick: dongHop }, 'Đóng'),
          el('button', { class: 'btn btn-primary', onclick: gui }, 'Đăng ký')));
    }
  };
  moHop('Tài khoản VPHONE', body);
  ve(tab);
}

// ------------------------------------------------------------------ sản phẩm
function moTaSanPham(sp) {
  if (sp.loai === 'DIEN_THOAI') return [`${sp.ram}GB RAM`, `${sp.boNho}GB`, sp.mauSac].filter(Boolean);
  if (sp.loai === 'PHU_KIEN') return [sp.loaiPhuKien].filter(Boolean);
  return [];
}

function anhSanPham(sp) {
  const fallback = sp.loai === 'PHU_KIEN' ? '/assets/accessory.svg' : '/assets/phone.svg';
  const src = sp.anh && /^(https?:\/\/|\/)[^\s]*$/i.test(sp.anh) ? sp.anh : fallback;
  const img = el('img', { src, alt: 'Ảnh ' + sp.ten, loading: 'lazy' });
  img.onerror = () => { img.onerror = null; img.src = fallback; };
  return img;
}

function theSanPham(sp) {
  const giam = sp.giaBan < sp.gia;
  const ton = sp.ton === 0 ? el('div', { class: 'stock out', text: 'Hết hàng' })
    : sp.ton <= 5 ? el('div', { class: 'stock low', text: `Sắp hết: còn ${sp.ton}` })
    : el('div', { class: 'stock ok', text: `Còn ${sp.ton} sản phẩm` });
  const act = el('div', { class: 'pactions' });
  if (laKhach()) {
    const sl = el('input', { type: 'text', inputMode: 'numeric', value: '1', 'aria-label': 'Số lượng' });
    const field = truong('Số lượng mua', sl);
    act.append(field, el('button', { class: 'btn btn-primary btn-sm', disabled: sp.ton === 0, onclick: () => themVaoGio(sp, sl) }, 'Thêm vào giỏ'));
  } else {
    act.append(el('button', { class: 'btn btn-sm', onclick: () => hopDangNhap('login') }, 'Đăng nhập để mua'));
  }
  return el('div', { class: 'pcard' },
    el('div', { class: 'pimg' }, anhSanPham(sp)),
    el('div', { class: 'pbody' },
      el('div', { class: 'pname', text: sp.ten }),
      el('div', { class: 'chips' }, el('span', { class: 'chip', text: sp.hang }), moTaSanPham(sp).map(t => el('span', { class: 'chip alt', text: t }))),
      el('div', { class: 'price' }, giam ? el('s', { text: vnd(sp.gia) }) : null, vnd(sp.giaBan)),
      giam ? el('div', { class: 'small muted', text: 'Phụ kiện được giảm 5%' }) : null,
      ton, el('div', { class: 'small muted', text: 'Mã: ' + sp.ma }), act));
}

async function themVaoGio(sp, sl) {
  const msg = soNguyen(sl.value, 1) || (Number(sl.value) > sp.ton ? `Chỉ còn ${sp.ton} sản phẩm.` : '');
  baoLoi(sl, msg);
  if (msg) { sl.focus(); return; }
  await thuc(async () => {
    await api('POST', 'gio', { ma: sp.ma, soLuong: Number(sl.value) });
    toast(`Đã thêm "${sp.ten}" vào giỏ hàng`); await capNhatGio();
  });
}

async function xoaSanPham(sp) {
  if (!await xacNhan('Xóa sản phẩm', `Xóa sản phẩm "${sp.ten}"? Hành động này không thể hoàn tác.`)) return;
  await thuc(async () => { await api('DELETE', 'sanpham/' + encodeURIComponent(sp.ma)); toast('Đã xóa sản phẩm'); await di('sanpham'); });
}

function hopSanPham(sp) {
  const sua = !!sp;
  const f = {
    loai: el('select', { disabled: sua }, el('option', { value: 'DIEN_THOAI', text: 'Điện thoại' }), el('option', { value: 'PHU_KIEN', text: 'Phụ kiện' })),
    ma: el('input', { value: sua ? sp.ma : '', disabled: sua }), ten: el('input', { value: sua ? sp.ten : '' }),
    hang: el('input', { value: sua ? sp.hang : '' }), gia: el('input', { type: 'text', inputMode: 'decimal', value: sua ? sp.gia : '' }),
    ton: el('input', { type: 'text', inputMode: 'numeric', value: sua ? sp.ton : '' }),
    ram: el('input', { type: 'text', inputMode: 'numeric', value: sua ? sp.ram ?? '' : '' }),
    boNho: el('input', { type: 'text', inputMode: 'numeric', value: sua ? sp.boNho ?? '' : '' }),
    mauSac: el('input', { value: sua ? sp.mauSac || '' : '' }), loaiPhuKien: el('input', { value: sua ? sp.loaiPhuKien || '' : '' }),
    anh: el('input', { type: 'url', placeholder: 'https://... hoặc /assets/...', value: sua ? sp.anh || '' : '' }),
  };
  if (sua) f.loai.value = sp.loai;
  const dt = [truong('RAM (GB)', f.ram), truong('Bộ nhớ (GB)', f.boNho), truong('Màu sắc', f.mauSac, 'span2')];
  const pk = [truong('Loại phụ kiện', f.loaiPhuKien, 'span2')];
  const vung = el('div', { class: 'form-grid' });
  const ve = () => {
    vung.replaceChildren(truong('Loại', f.loai), truong('Mã sản phẩm', f.ma), truong('Tên sản phẩm', f.ten, 'span2'), truong('Hãng', f.hang),
      truong('Giá bán (₫)', f.gia), truong('Số lượng tồn', f.ton), ...(f.loai.value === 'PHU_KIEN' ? pk : dt), truong('Đường dẫn ảnh (không bắt buộc)', f.anh, 'span2'));
  };
  f.loai.addEventListener('change', ve); ve();
  const luu = () => {
    const rules = { ten: batBuoc, hang: batBuoc, gia: soDuong, ton: v => soNguyen(v), anh: anhHopLe };
    if (!sua) rules.ma = batBuoc;
    if (f.loai.value === 'DIEN_THOAI') {
      rules.ram = v => soNguyen(v, 1); rules.boNho = v => soNguyen(v, 1);
    }
    if (!kiemTra(f, rules)) return;
    luuForm(async () => {
      const d = {}; for (const k in f) if (!['ma', 'loai'].includes(k) || !sua) d[k] = f[k].value.trim();
      if (sua) await api('PUT', 'sanpham/' + encodeURIComponent(sp.ma), d);
      else await api('POST', 'sanpham', d);
      toast(sua ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm ' + f.ma.value);
      dongHop(); await di('sanpham');
    }, f, { 'giá': 'gia', 'gia': 'gia', 'số lượng': 'ton', 'so luong': 'ton', 'ram': 'ram', 'bộ nhớ': 'boNho', 'bo nho': 'boNho', 'ảnh': 'anh' });
  };
  moHop(sua ? 'Sửa sản phẩm ' + sp.ma : 'Thêm sản phẩm mới', vung,
    [el('button', { class: 'btn', onclick: dongHop }, 'Hủy'), el('button', { class: 'btn btn-primary', onclick: luu }, 'Lưu')]);
}

async function viewSanPham() {
  const q = el('input', { class: 'search', placeholder: 'Tìm theo tên hoặc hãng (ví dụ: samsung)', value: S.f.q });
  const min = el('input', { type: 'text', inputMode: 'decimal', placeholder: 'Giá từ', value: S.f.min });
  const max = el('input', { type: 'text', inputMode: 'decimal', placeholder: 'Giá đến', value: S.f.max });
  const sx = el('select', {}, el('option', { value: '', text: 'Thứ tự mặc định' }), el('option', { value: 'gia_tang', text: 'Giá tăng dần' }), el('option', { value: 'gia_giam', text: 'Giá giảm dần' }));
  sx.value = S.f.sort;
  const luoi = el('div', { class: laQuanTri() ? 'tablewrap' : 'grid' });
  const dem = el('span', { class: 'muted' });
  const tai = async () => {
    let error = false;
    for (const i of [min, max]) {
      const msg = i.value.trim() && (!Number.isFinite(Number(i.value)) || Number(i.value) < 0) ? 'Giá phải là số không âm.' : '';
      baoLoi(i, msg); if (msg) error = true;
    }
    if (!error && min.value && max.value && Number(min.value) > Number(max.value)) {
      baoLoi(max, 'Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.'); error = true;
    }
    if (error) return;
    S.f = { q: q.value, min: min.value, max: max.value, sort: sx.value };
    await thuc(async () => {
      const ds = await api('GET', 'sanpham?' + new URLSearchParams(S.f));
      dem.textContent = ds.length + ' sản phẩm';
      if (laQuanTri()) {
        luoi.replaceChildren(el('table', {},
          el('thead', {}, el('tr', {}, ['Ảnh', 'Mã', 'Sản phẩm', 'Hãng / thông số', 'Giá bán', 'Tồn kho', 'Thao tác'].map(t => el('th', { text: t })))),
          el('tbody', {}, ds.length ? ds.map(sp => el('tr', {},
            el('td', {}, el('div', { class: 'thumb' }, anhSanPham(sp))), el('td', { text: sp.ma }),
            el('td', {}, el('b', { text: sp.ten }), el('div', { class: 'small muted', text: sp.loai === 'PHU_KIEN' ? 'Phụ kiện' : 'Điện thoại' })),
            el('td', {}, el('b', { text: sp.hang }), el('div', { class: 'small muted', text: moTaSanPham(sp).join(' · ') })),
            el('td', { class: 'num', text: vnd(sp.giaBan) }), el('td', { class: 'num', text: sp.ton }),
            el('td', {}, el('div', { class: 'row nowrap' }, el('button', { class: 'btn btn-sm', onclick: () => hopSanPham(sp) }, 'Sửa'),
              el('button', { class: 'btn btn-sm btn-danger', onclick: () => xoaSanPham(sp) }, 'Xóa')))))
            : [el('tr', {}, el('td', { colSpan: 7, class: 'empty', text: 'Không tìm thấy sản phẩm phù hợp' }))])));
      } else luoi.replaceChildren(...(ds.length ? ds.map(theSanPham) : [el('div', { class: 'empty', text: 'Không tìm thấy sản phẩm phù hợp' })]));
    });
  };
  q.addEventListener('keydown', e => { if (e.key === 'Enter') tai(); });
  sx.addEventListener('change', tai);
  const tb = el('div', { class: 'toolbar' }, q, truong('Giá từ (₫)', min), truong('Giá đến (₫)', max), sx,
    el('button', { class: 'btn btn-primary', onclick: tai }, 'Tìm kiếm'),
    el('button', { class: 'btn', onclick: () => { q.value = min.value = max.value = sx.value = ''; baoLoi(min, ''); baoLoi(max, ''); tai(); } }, 'Xóa lọc'),
    laQuanTri() ? el('button', { class: 'btn btn-primary', onclick: () => hopSanPham(null) }, '+ Thêm sản phẩm') : null);
  const root = el('div', {}, el('div', { class: 'row heading' }, el('h2', { text: laQuanTri() ? 'Quản lý sản phẩm' : 'Sản phẩm' }), dem), tb, luoi);
  await tai(); return root;
}

// ------------------------------------------------------------------ giỏ hàng
async function viewGio() {
  if (!laKhach()) return el('div', { class: 'empty', text: 'Vui lòng đăng nhập bằng tài khoản khách hàng.' });
  const g = await api('GET', 'gio');
  if (!g.items.length) return el('div', {}, el('h2', { text: 'Giỏ hàng' }), el('div', { class: 'empty' }, el('div', { class: 'big', text: '🛒' }), 'Giỏ hàng đang trống', el('div', { style: 'margin-top:14px' }, el('button', { class: 'btn btn-primary', onclick: () => di('sanpham') }, 'Xem sản phẩm'))));
  const dat = () => thuc(async () => {
    const d = await api('POST', 'donhang', {});
    toast(`Đặt hàng thành công! Mã đơn: ${d.ma}`);
    await capNhatGio(); await di('donhang');
  });
  const rows = g.items.map(i => el('tr', {}, el('td', { text: i.ma }), el('td', { text: i.ten }), el('td', { class: 'num', text: vnd(i.donGia) }),
    el('td', { class: 'num', text: i.soLuong }), el('td', { class: 'num', text: vnd(i.thanhTien) }),
    el('td', {}, el('button', { class: 'btn btn-sm btn-danger', onclick: () => thuc(async () => { await api('DELETE', 'gio/' + encodeURIComponent(i.ma)); await capNhatGio(); await di('gio'); }) }, 'Xóa'))));
  return el('div', {}, el('h2', { text: 'Giỏ hàng' }),
    el('div', { class: 'tablewrap' }, el('table', {}, el('thead', {}, el('tr', {}, ['Mã', 'Sản phẩm', 'Đơn giá', 'SL', 'Thành tiền', ''].map((t, k) => el('th', { class: k > 1 && k < 5 ? 'num' : '', text: t })))), el('tbody', {}, rows))),
    el('div', { class: 'total', text: 'Tổng tiền: ' + vnd(g.tong) }),
    el('div', { class: 'row', style: 'justify-content:flex-end;margin-top:12px' }, el('button', { class: 'btn', onclick: () => di('sanpham') }, 'Mua thêm'), el('button', { class: 'btn btn-primary', onclick: dat }, 'Đặt hàng')));
}

// ------------------------------------------------------------------ đơn hàng
async function viewDonHang() {
  if (!S.user) return el('div', { class: 'empty', text: 'Vui lòng đăng nhập.' });
  const ds = await api('GET', 'donhang');
  if (!ds.length) return el('div', {}, el('h2', { text: laQuanTri() ? 'Đơn hàng' : 'Đơn hàng của tôi' }), el('div', { class: 'empty' }, el('div', { class: 'big', text: '📦' }), 'Chưa có đơn hàng nào'));
  const doi = async (d, tt) => {
    if (tt === 'DA_HUY' && !await xacNhan('Hủy đơn hàng', `Hủy đơn ${d.ma}? Tồn kho sẽ được hoàn lại.`, 'Hủy đơn')) return;
    await thuc(async () => {
      await api('POST', `donhang/${encodeURIComponent(d.ma)}/trangthai`, { trangThai: tt });
      toast(`Đơn ${d.ma}: ${TT[tt]}`); await di('donhang');
    });
  };
  const cards = ds.map(d => {
    const acts = [];
    if (laQuanTri()) for (const tt of TT_TIEP[d.trangThai]) acts.push(el('button', { class: 'btn btn-sm' + (tt === 'DA_HUY' ? ' btn-danger' : ' btn-primary'), onclick: () => doi(d, tt) }, tt === 'DA_HUY' ? 'Hủy đơn' : '→ ' + TT[tt]));
    else if (d.trangThai === 'CHO_XAC_NHAN') acts.push(el('button', { class: 'btn btn-sm btn-danger', onclick: () => doi(d, 'DA_HUY') }, 'Hủy đơn'));
    return el('div', { class: 'card order' },
      el('div', { class: 'order-h' }, el('b', { text: 'Đơn ' + d.ma }), el('span', { class: 'status st-' + d.trangThai, text: TT[d.trangThai] }),
        el('span', { class: 'muted', text: d.ngay }), laQuanTri() ? el('span', { class: 'muted', text: 'Khách: ' + d.khach + ' (' + d.maKhach + ')' }) : null,
        el('span', { class: 'grow' }), ...acts),
      el('div', { class: 'tablewrap' },
        el('table', {},
          el('thead', {}, el('tr', {}, ['Sản phẩm', 'Đơn giá', 'SL', 'Thành tiền'].map((t, k) =>
            el('th', { class: k ? 'num' : '', text: t })))),
          el('tbody', {}, d.chiTiet.map(c =>
            el('tr', {}, el('td', { text: c.ten }), el('td', { class: 'num', text: vnd(c.donGia) }),
              el('td', { class: 'num', text: c.soLuong }), el('td', { class: 'num', text: vnd(c.thanhTien) })))))),
      el('div', { class: 'total', text: 'Tổng: ' + vnd(d.tong) }));

  });
  return el('div', {}, el('h2', { text: laQuanTri() ? 'Quản lý đơn hàng' : 'Đơn hàng của tôi' }), ...cards);
}

// ------------------------------------------------------------------ nhập hàng (quản trị)
async function viewNhapHang() {
  const [ncc, sps, pns] = await Promise.all([api('GET', 'nhacungcap'), api('GET', 'sanpham'), api('GET', 'phieunhap')]);
  const root = el('div');
  const suaNCC = (c) => {
    const f = { ten: el('input', { value: c.ten }), diaChi: el('input', { value: c.diaChi || '' }), sdt: el('input', { value: c.sdt || '' }) };
    const body = el('div', { class: 'form-grid' }, truong('Tên nhà cung cấp', f.ten, 'span2'), truong('Địa chỉ', f.diaChi), truong('Số điện thoại', f.sdt));
    const luu = () => {
      if (!kiemTra(f, { ten: batBuoc, sdt: soDienThoai })) return;
      luuForm(async () => {
        await api('PUT', 'nhacungcap/' + encodeURIComponent(c.ma), { ten: f.ten.value, diaChi: f.diaChi.value, sdt: f.sdt.value });
        toast('Đã cập nhật nhà cung cấp'); dongHop(); await di('nhaphang');
      }, f, { 'điện thoại': 'sdt' });
    };
    moHop('Sửa nhà cung cấp ' + c.ma, body, [el('button', { class: 'btn', onclick: dongHop }, 'Hủy'), el('button', { class: 'btn btn-primary', onclick: luu }, 'Lưu')]);
  };
  const xoaNCC = async c => {
    if (!await xacNhan('Xóa nhà cung cấp', `Xóa nhà cung cấp "${c.ten}"? Nếu đã có phiếu nhập, thao tác sẽ bị từ chối.`)) return;
    await thuc(async () => { await api('DELETE', 'nhacungcap/' + encodeURIComponent(c.ma)); toast('Đã xóa nhà cung cấp'); await di('nhaphang'); });
  };
  const f = { ma: el('input', { placeholder: 'Mã (NCC03)' }), ten: el('input', { placeholder: 'Tên nhà cung cấp' }), diaChi: el('input', { placeholder: 'Địa chỉ' }), sdt: el('input', { placeholder: 'Số điện thoại' }) };
  const themNCC = () => {
    if (!kiemTra(f, { ma: batBuoc, ten: batBuoc, sdt: soDienThoai })) return;
    luuForm(async () => { const d = {}; for (const k in f) d[k] = f[k].value; await api('POST', 'nhacungcap', d); toast('Đã thêm nhà cung cấp'); await di('nhaphang'); }, f, { 'điện thoại': 'sdt' });
  };
  root.append(el('h2', { text: 'Nhà cung cấp' }),
    el('div', { class: 'tablewrap' }, el('table', {}, el('thead', {}, el('tr', {}, ['Mã', 'Tên', 'Địa chỉ', 'SĐT', 'Thao tác'].map(t => el('th', { text: t })))),
      el('tbody', {}, ncc.map(c => el('tr', {}, el('td', { text: c.ma }), el('td', { text: c.ten }), el('td', { text: c.diaChi }), el('td', { text: c.sdt }),
        el('td', {}, el('div', { class: 'row nowrap' }, el('button', { class: 'btn btn-sm', onclick: () => suaNCC(c) }, 'Sửa'), el('button', { class: 'btn btn-sm btn-danger', onclick: () => xoaNCC(c) }, 'Xóa')))))))),
    el('div', { class: 'toolbar form-toolbar', style: 'margin-top:12px' }, truong('Mã', f.ma), truong('Tên nhà cung cấp', f.ten), truong('Địa chỉ', f.diaChi), truong('Số điện thoại', f.sdt), el('button', { class: 'btn btn-primary', onclick: themNCC }, '+ Thêm')));

  const chonNCC = el('select', {}, ncc.map(c => el('option', { value: c.ma, text: `${c.ma} - ${c.ten}` })));
  const dong = el('div');
  const themDong = () => {
    const sp = el('select', {}, sps.map(s => el('option', { value: s.ma, text: `${s.ma} - ${s.ten}` })));
    const sl = el('input', { type: 'text', inputMode: 'numeric', placeholder: 'SL' });
    const gia = el('input', { type: 'text', inputMode: 'decimal', placeholder: 'Giá nhập (₫)' });
    const r = el('div', { class: 'item-row' }, sp, sl, gia, el('button', { class: 'btn btn-sm btn-danger', onclick: () => r.remove() }, 'Xóa'));
    r._get = () => ({ ma: sp.value, soLuong: sl.value, giaNhap: gia.value }); r._fields = { sl, gia }; dong.append(r);
  };
  themDong();
  const lap = () => {
    let ok = true;
    for (const r of [...dong.children]) { const a = soNguyen(r._fields.sl.value, 1), b = soDuong(r._fields.gia.value); baoLoi(r._fields.sl, a); baoLoi(r._fields.gia, b); if (a || b) ok = false; }
    if (!ok) return;
    luuForm(async () => { const pn = await api('POST', 'phieunhap', { maNCC: chonNCC.value, items: [...dong.children].map(r => r._get()) }); toast(`Đã lập phiếu ${pn.ma}, tồn kho đã được cập nhật`); await di('nhaphang'); }, {});
  };
  root.append(el('div', { class: 'section-title' }, el('h2', { text: 'Lập phiếu nhập hàng', style: 'margin:0' })),
    el('div', { class: 'card' }, el('div', { class: 'row', style: 'margin-bottom:12px' }, el('label', { class: 'f' }, 'Nhà cung cấp', chonNCC)), dong,
      el('div', { class: 'row' }, el('button', { class: 'btn btn-sm', onclick: themDong }, '+ Thêm dòng'), el('span', { class: 'grow' }), el('button', { class: 'btn btn-primary', onclick: lap }, 'Lập phiếu nhập'))));
  root.append(el('div', { class: 'section-title' }, el('h2', { text: 'Các phiếu nhập', style: 'margin:0' })),
    ...(pns.length ? pns.map(p => el('div', { class: 'card order' }, el('div', { class: 'order-h' }, el('b', { text: 'Phiếu ' + p.ma }), el('span', { class: 'muted', text: p.ngay }), el('span', { class: 'muted', text: 'NCC: ' + p.ncc })),
      el('div', { class: 'tablewrap' },
        el('table', {},
          el('thead', {}, el('tr', {}, ['Sản phẩm', 'SL nhập', 'Giá nhập'].map((t, k) =>
            el('th', { class: k ? 'num' : '', text: t })))),
          el('tbody', {}, p.chiTiet.map(c =>
            el('tr', {}, el('td', { text: c.ten }), el('td', { class: 'num', text: c.soLuong }),
              el('td', { class: 'num', text: vnd(c.giaNhap) })))))),
      el('div', { class: 'total', text: 'Tổng tiền nhập: ' + vnd(p.tong) }))) : [el('div', { class: 'empty', text: 'Chưa có phiếu nhập nào' })]));

  return root;
}

// ------------------------------------------------------------------ thống kê (quản trị)
function bieuDo(du, nhan) {
  const max = Math.max(1, ...Object.values(du));
  return el('div', {}, Object.entries(du).map(([k, v]) => el('div', { class: 'bar' }, el('span', { class: 'lb', text: nhan ? nhan(k) : k }),
    el('span', { class: 'track' }, el('span', { class: 'fill', style: `display:block;width:${(v / max) * 100}%` })), el('span', { class: 'nv', text: v }))));
}

async function viewThongKe() {
  const t = await api('GET', 'thongke');
  const stat = (k, v) => el('div', { class: 'card stat' }, el('div', { class: 'k', text: k }), el('div', { class: 'v', text: v }));
  return el('div', {}, el('h2', { text: 'Thống kê' }),
    el('div', { class: 'stats' }, stat('Tổng giá trị tồn kho', vnd(t.tongGiaTriTon)), stat('Doanh thu (đơn hoàn thành)', vnd(t.doanhThu)),
      stat('Số sản phẩm', t.soSanPham), stat('Số khách hàng', t.soKhachHang), stat('Sản phẩm giá cao nhất', t.giaCaoNhat ? t.giaCaoNhat.ten : '-')),
    el('div', { class: 'panels' }, el('div', { class: 'card' }, el('h3', { text: 'Đơn hàng theo trạng thái' }), bieuDo(t.donTheoTrangThai, k => TT[k]))),
    el('div', { class: 'card' }, el('h3', { text: 'Cảnh báo sắp hết hàng (tồn ≤ 5)' }),
      t.sapHet.length ? el('div', { class: 'tablewrap' },
        el('table', {},
          el('thead', {}, el('tr', {}, ['Mã', 'Sản phẩm', 'Hãng', 'Tồn'].map((x, k) =>
            el('th', { class: k === 3 ? 'num' : '', text: x })))),
          el('tbody', {}, t.sapHet.map(s =>
            el('tr', {}, el('td', { text: s.ma }), el('td', { text: s.ten }), el('td', { text: s.hang }),
              el('td', { class: 'num', text: s.ton }))))))
        : el('div', { class: 'muted', text: 'Không có sản phẩm nào sắp hết hàng.' })));
}

async function viewNguoiDung() {
  const ds = await api('GET', 'nguoidung');
  return el('div', {}, el('h2', { text: 'Người dùng' }), el('div', { class: 'tablewrap' }, el('table', {},
    el('thead', {}, el('tr', {}, ['Mã', 'Họ tên', 'Email', 'SĐT', 'Vai trò', 'Địa chỉ / Chức vụ'].map(t => el('th', { text: t })))),
    el('tbody', {}, ds.map(u => el('tr', {}, el('td', { text: u.ma }), el('td', { text: u.hoTen }), el('td', { text: u.email }), el('td', { text: u.sdt }),
      el('td', { text: u.vaiTro === 'QUAN_TRI' ? 'Quản trị viên' : 'Khách hàng' }), el('td', { text: u.diaChi || u.chucVu || '' })))))));
}

const VIEWS = { sanpham: viewSanPham, gio: viewGio, donhang: viewDonHang, nhaphang: viewNhapHang, thongke: viewThongKe, nguoidung: viewNguoiDung };

// ------------------------------------------------------------------ khởi động
(async function khoiDong() {
  try { S.info = await api('GET', 'info'); } catch (e) { /* bỏ qua */ }
  if (S.token) {
    try { S.user = await api('GET', 'me'); } catch (e) { S.token = null; sessionStorage.removeItem('token'); }
  }
  await capNhatGio();
  await di(S.user && laQuanTri() ? 'thongke' : 'sanpham');
})();
