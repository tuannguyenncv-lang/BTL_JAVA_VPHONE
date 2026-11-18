import { useCallback, useEffect, useMemo, useState } from 'react';
import { CartView } from './components/CartView';
import { CompareModal } from './components/CompareModal';
import { ImportView } from './components/ImportView';
import { InvoiceModal } from './components/InvoiceModal';
import { AuthModal, ConfirmModal, ProductModal, SupplierModal } from './components/Modals';
import { Navbar } from './components/Navbar';
import { OracleSqlView } from './components/OracleSqlView';
import { OrdersView } from './components/OrdersView';
import { PaymentQrModal } from './components/PaymentQrModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { PromosView } from './components/PromosView';
import { StatsView } from './components/StatsView';
import { StorefrontView } from './components/StorefrontView';
import { ToastContainer } from './components/ToastContainer';
import { UsersView } from './components/UsersView';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  mapFirebaseAuthError,
  signInWithGoogle,
  signOutFromFirebase,
  subscribeFirebaseAuth,
  syncGoogleUserProfile,
} from './firebase';
import {
  sendOrderConfirmationEmail,
  sendWelcomeEmail,
} from './services/emailClient';
import {
  addProductReview,
  addToCart,
  authenticateUser,
  createImportReceipt,
  deleteProductByCode,
  deletePromoByCode,
  deleteSupplierByCode,
  loadSessionUser,
  loadStoreState,
  placeOrderFromCart,
  registerCustomer,
  removeFromCart,
  saveSessionUser,
  saveStoreState,
  togglePromoStatus,
  transitionOrderStatus,
  updateCartQuantity,
  upsertGoogleUser,
  upsertProduct,
  upsertPromo,
  upsertSupplier,
  type StoreState,
} from './services/vphoneStore';
import type {
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductType,
  PromoCode,
  SafeUser,
  Supplier,
  ToastMessage,
  ViewId,
} from './types/vphone';
import {
  ORDER_STATUS_LABELS,
  ROLE_LABELS,
  buildCartSummary,
  canAccessView,
  computeStoreStats,
} from './utils/vphoneLogic';

function defaultViewForUser(u: SafeUser | null): ViewId {
  if (!u) return 'sanpham';
  if (u.vaiTro === 'QUAN_TRI' || u.vaiTro === 'NHAN_VIEN_BAN_HANG') return 'thongke';
  if (u.vaiTro === 'THU_KHO') return 'nhaphang';
  return 'sanpham';
}

export default function App() {
  const [store, setStore] = useState<StoreState>(() => loadStoreState());
  const [user, setUser] = useState<SafeUser | null>(() => loadSessionUser(loadStoreState().users));
  const [view, setView] = useState<ViewId>(() =>
    defaultViewForUser(loadSessionUser(loadStoreState().users)),
  );

  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vphone_theme') === 'dark';
    } catch {
      return false;
    }
  });

  const [authOpen, setAuthOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [detailProductMa, setDetailProductMa] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [qrOrder, setQrOrder] = useState<Order | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('vphone_theme', isDark ? 'dark' : 'light');
    } catch {
      // Ignore
    }
  }, [isDark]);

  const commitStore = useCallback((next: StoreState) => {
    setStore(next);
    saveStoreState(next);
  }, []);

  const pushToast = useCallback((title: string, kind: 'ok' | 'err' = 'ok', detail?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, title, kind, detail }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, kind === 'err' ? 6000 : 4500);
  }, []);

  const cartSummary = useMemo(() => {
    if (!user || user.vaiTro !== 'KHACH_HANG') {
      return { items: [], tong: 0, tongGiam: 0, soLuong: 0 };
    }
    return buildCartSummary(store.carts[user.ma] || [], store.products);
  }, [store.carts, store.products, user]);

  const storeStats = useMemo(
    () => computeStoreStats(store.products, store.orders, store.users),
    [store.orders, store.products, store.users],
  );

  const detailProduct = useMemo(
    () => (detailProductMa ? store.products.find((p) => p.ma === detailProductMa) || null : null),
    [detailProductMa, store.products],
  );

  const compareProducts = useMemo(
    () =>
      compareIds
        .map((id) => store.products.find((p) => p.ma === id))
        .filter((p): p is Product => Boolean(p)),
    [compareIds, store.products],
  );

  /* ---------------- Auth Handlers ---------------- */

  const applyFirebaseUserToStore = useCallback(
    async (
      fbUser: {
        uid: string;
        email: string | null;
        displayName: string | null;
        photoURL: string | null;
        emailVerified: boolean;
      },
      options?: { showWelcomeToast?: boolean; closeModal?: boolean },
    ) => {
      if (!fbUser.email) {
        throw new Error('Tài khoản Google không cung cấp địa chỉ email hợp lệ.');
      }
      const isBootAdmin =
        fbUser.emailVerified &&
        fbUser.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

      const currentStore = loadStoreState();
      const {
        nextState: initialNext,
        user: initialUser,
        isNewUser,
      } = upsertGoogleUser(currentStore, {
        uid: fbUser.uid,
        email: fbUser.email,
        hoTen: fbUser.displayName || fbUser.email.split('@')[0],
        avatarUrl: fbUser.photoURL || undefined,
        isBootstrappedAdmin: isBootAdmin,
      });

      commitStore(initialNext);
      setUser(initialUser);
      saveSessionUser(initialUser.ma);
      if (options?.closeModal) {
        setAuthOpen(false);
        setView(defaultViewForUser(initialUser));
      }
      if (options?.showWelcomeToast) {
        pushToast(
          `Chào mừng ${initialUser.hoTen}!`,
          'ok',
          `Đăng nhập Google thành công · ${ROLE_LABELS[initialUser.vaiTro]}`,
        );
        void sendWelcomeEmail({
          email: initialUser.email,
          hoTen: initialUser.hoTen,
          maKhach: initialUser.ma,
          loginMethod: 'GOOGLE',
          event: isNewUser ? 'REGISTER' : 'LOGIN',
          vaiTroLabel: ROLE_LABELS[initialUser.vaiTro],
        }).then((res) => {
          if (res.sent) {
            pushToast(`Đã gửi email chào mừng tới ${initialUser.email}`);
          } else if (isNewUser && res.sandboxRestricted && res.error) {
            pushToast('Email Resend đang ở chế độ thử nghiệm', 'err', res.error);
          } else if (!res.sandboxRestricted && res.configured && res.error) {
            pushToast('Không thể gửi email chào mừng', 'err', res.error);
          }
        });
      }

      try {
        const synced = await syncGoogleUserProfile(
          fbUser as Parameters<typeof syncGoogleUserProfile>[0],
          initialUser.ma,
          initialUser.vaiTro,
        );
        if (synced.vaiTro !== initialUser.vaiTro || synced.ma !== initialUser.ma) {
          const latestStore = loadStoreState();
          const { nextState: syncedState, user: syncedUser } = upsertGoogleUser(latestStore, {
            uid: fbUser.uid,
            email: fbUser.email,
            hoTen: fbUser.displayName || fbUser.email.split('@')[0],
            avatarUrl: fbUser.photoURL || undefined,
            isBootstrappedAdmin: isBootAdmin,
            resolvedRole: synced.vaiTro,
          });
          commitStore(syncedState);
          setUser(syncedUser);
          saveSessionUser(syncedUser.ma);
        }
      } catch {
        // Firestore profile sync error is already logged via handleFirestoreError
      }
    },
    [commitStore, pushToast],
  );

  useEffect(() => {
    const unsubscribe = subscribeFirebaseAuth((fbUser) => {
      if (!fbUser || !fbUser.email) return;
      void applyFirebaseUserToStore(fbUser, { showWelcomeToast: false, closeModal: false });
    });
    return unsubscribe;
  }, [applyFirebaseUserToStore]);

  const handleLogin = (email: string, matKhau: string) => {
    const loggedIn = authenticateUser(store, email, matKhau);
    setUser(loggedIn);
    saveSessionUser(loggedIn.ma);
    setAuthOpen(false);
    setView(defaultViewForUser(loggedIn));
    pushToast(
      `Chào mừng ${loggedIn.hoTen}!`,
      'ok',
      `Đăng nhập thành công · ${ROLE_LABELS[loggedIn.vaiTro]}`,
    );
    void sendWelcomeEmail({
      email: loggedIn.email,
      hoTen: loggedIn.hoTen,
      maKhach: loggedIn.ma,
      loginMethod: 'LOCAL',
      event: 'LOGIN',
      vaiTroLabel: ROLE_LABELS[loggedIn.vaiTro],
    }).then((res) => {
      if (res.sent) {
        pushToast(`Đã gửi email chào mừng tới ${loggedIn.email}`);
      } else if (!res.sandboxRestricted && res.configured && res.error) {
        pushToast('Không thể gửi email chào mừng', 'err', res.error);
      }
    });
  };

  const handleGoogleLogin = async () => {
    try {
      const fbUser = await signInWithGoogle();
      await applyFirebaseUserToStore(fbUser, { showWelcomeToast: true, closeModal: true });
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  };

  const handleRegister = (input: {
    hoTen: string;
    email: string;
    matKhau: string;
    sdt: string;
    diaChi: string;
  }) => {
    const { nextState, user: created } = registerCustomer(store, input);
    commitStore(nextState);
    pushToast(`Đăng ký thành công, mã khách hàng: ${created.ma}`);
    void sendWelcomeEmail({
      email: created.email,
      hoTen: created.hoTen,
      maKhach: created.ma,
      loginMethod: 'LOCAL',
    }).then((res) => {
      if (res.sent) {
        pushToast(`Đã gửi email xác nhận tạo tài khoản tới ${created.email}`);
      } else if (res.sandboxRestricted && res.error) {
        pushToast('Email Resend đang ở chế độ thử nghiệm', 'err', res.error);
      } else if (res.configured && res.error) {
        pushToast('Không thể gửi email chào mừng', 'err', res.error);
      }
    });
  };

  const handleLogout = () => {
    void signOutFromFirebase();
    setUser(null);
    saveSessionUser(null);
    setView('sanpham');
    pushToast('Đã đăng xuất');
  };

  /* ---------------- Product & Review Handlers ---------------- */

  const handleSaveProduct = (payload: {
    isEdit: boolean;
    ma: string;
    ten: string;
    hang: string;
    loai: ProductType;
    gia: number;
    ton: number;
    ram?: number;
    boNho?: number;
    mauSac?: string;
    loaiPhuKien?: string;
    anh?: string;
    flashSaleGia?: number;
    manHinh?: string;
    chip?: string;
    camera?: string;
    pin?: string;
  }) => {
    const next = upsertProduct(store, payload);
    commitStore(next);
    setEditingProduct(undefined);
    pushToast(payload.isEdit ? 'Đã cập nhật sản phẩm' : `Đã thêm sản phẩm ${payload.ma.toUpperCase()}`);
  };

  const handleDeleteProduct = (sp: Product) => {
    setConfirmState({
      title: 'Xóa sản phẩm',
      message: `Xóa sản phẩm "${sp.ten}"? Hành động này không thể hoàn tác.`,
      confirmLabel: 'Xóa',
      onConfirm: () => {
        commitStore(deleteProductByCode(store, sp.ma));
        setCompareIds((prev) => prev.filter((id) => id !== sp.ma));
        setConfirmState(null);
        pushToast('Đã xóa sản phẩm');
      },
    });
  };

  const handleToggleCompare = (sp: Product) => {
    if (sp.loai !== 'DIEN_THOAI') {
      pushToast('Chỉ hỗ trợ so sánh giữa các điện thoại', 'err');
      return;
    }
    setCompareIds((prev) => {
      if (prev.includes(sp.ma)) {
        return prev.filter((id) => id !== sp.ma);
      }
      if (prev.length >= 3) {
        pushToast('Chỉ chọn tối đa 3 điện thoại để so sánh', 'err');
        return prev;
      }
      return [...prev, sp.ma];
    });
  };

  const handleSubmitReview = (maSanPham: string, sao: number, binhLuan: string) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const next = addProductReview(store, { maSanPham, user, sao, binhLuan });
    commitStore(next);
    pushToast('Cảm ơn bạn đã gửi đánh giá');
  };

  /* ---------------- Cart & Order Handlers ---------------- */

  const handleAddToCart = (sp: Product, qty: number) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    try {
      const next = addToCart(store, user.ma, sp.ma, qty);
      commitStore(next);
      pushToast(`Đã thêm "${sp.ten}" vào giỏ hàng`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể thêm vào giỏ', 'err');
    }
  };

  const handleUpdateCartQty = (ma: string, qty: number) => {
    if (!user) return;
    try {
      commitStore(updateCartQuantity(store, user.ma, ma, qty));
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể cập nhật số lượng', 'err');
    }
  };

  const handleRemoveCartItem = (ma: string) => {
    if (!user) return;
    commitStore(removeFromCart(store, user.ma, ma));
    pushToast('Đã xóa sản phẩm khỏi giỏ hàng');
  };

  const handlePlaceOrder = (options: {
    promoCode?: string;
    paymentMethod: PaymentMethod;
  }) => {
    if (!user) return;
    try {
      const { nextState, order } = placeOrderFromCart(store, user, options);
      commitStore(nextState);
      setView('donhang');
      if (order.phuongThucThanhToan !== 'COD') {
        setQrOrder(order);
      }
      pushToast(`Đặt hàng thành công! Mã đơn: ${order.ma}`);
      void sendOrderConfirmationEmail({
        email: user.email,
        order,
      }).then((res) => {
        if (res.sent) {
          pushToast(`Đã gửi email xác nhận đơn ${order.ma} tới ${user.email}`);
        } else if (res.sandboxRestricted && res.error) {
          pushToast(`Email đơn ${order.ma} ở chế độ thử nghiệm Resend`, 'err', res.error);
        } else if (res.configured && res.error) {
          pushToast(`Không thể gửi email đơn ${order.ma}`, 'err', res.error);
        }
      });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Đặt hàng thất bại', 'err');
    }
  };

  const handleTransitionOrder = (order: Order, nextStatus: OrderStatus) => {
    if (!user) return;
    const canManageOrders = user.vaiTro === 'QUAN_TRI' || user.vaiTro === 'NHAN_VIEN_BAN_HANG';
    const perform = () => {
      try {
        const next = transitionOrderStatus(store, order.ma, nextStatus, canManageOrders, user.ma);
        commitStore(next);
        pushToast(`Đơn ${order.ma}: ${ORDER_STATUS_LABELS[nextStatus]}`);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'Cập nhật thất bại', 'err');
      }
    };

    if (nextStatus === 'DA_HUY') {
      setConfirmState({
        title: 'Hủy đơn hàng',
        message: `Hủy đơn ${order.ma}? Tồn kho sẽ được hoàn lại.`,
        confirmLabel: 'Hủy đơn',
        onConfirm: () => {
          setConfirmState(null);
          perform();
        },
      });
    } else {
      perform();
    }
  };

  /* ---------------- Promo Handlers ---------------- */

  const handleSavePromo = (promo: PromoCode) => {
    commitStore(upsertPromo(store, promo));
    pushToast(`Đã lưu mã giảm giá ${promo.ma}`);
  };

  const handleTogglePromo = (code: string) => {
    commitStore(togglePromoStatus(store, code));
    pushToast(`Đã cập nhật trạng thái mã ${code}`);
  };

  const handleDeletePromo = (promo: PromoCode) => {
    setConfirmState({
      title: 'Xóa mã giảm giá',
      message: `Xóa mã "${promo.ma}"? Khách hàng sẽ không thể áp dụng mã này nữa.`,
      confirmLabel: 'Xóa',
      onConfirm: () => {
        commitStore(deletePromoByCode(store, promo.ma));
        setConfirmState(null);
        pushToast(`Đã xóa mã ${promo.ma}`);
      },
    });
  };

  /* ---------------- Supplier & Import Handlers ---------------- */

  const handleAddSupplier = (supplier: Supplier) => {
    try {
      const next = upsertSupplier(store, false, supplier);
      commitStore(next);
      pushToast('Đã thêm nhà cung cấp');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể thêm nhà cung cấp', 'err');
    }
  };

  const handleSaveSupplier = (supplier: Supplier) => {
    const next = upsertSupplier(store, true, supplier);
    commitStore(next);
    setEditingSupplier(null);
    pushToast('Đã cập nhật nhà cung cấp');
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setConfirmState({
      title: 'Xóa nhà cung cấp',
      message: `Xóa nhà cung cấp "${supplier.ten}"? Nếu đã có phiếu nhập, thao tác sẽ bị từ chối.`,
      confirmLabel: 'Xóa',
      onConfirm: () => {
        setConfirmState(null);
        try {
          commitStore(deleteSupplierByCode(store, supplier.ma));
          pushToast('Đã xóa nhà cung cấp');
        } catch (err) {
          pushToast(err instanceof Error ? err.message : 'Không thể xóa nhà cung cấp', 'err');
        }
      },
    });
  };

  const handleCreateReceipt = (
    maNCC: string,
    lines: { ma: string; soLuong: number; giaNhap: number }[],
  ) => {
    try {
      const { nextState, receipt } = createImportReceipt(store, maNCC, lines);
      commitStore(nextState);
      pushToast(`Đã lập phiếu ${receipt.ma}, tồn kho đã được cập nhật`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Lập phiếu thất bại', 'err');
    }
  };

  const activeView: ViewId = canAccessView(user?.vaiTro, view) ? view : 'sanpham';

  return (
    <div id="top" className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100">
      <Navbar
        user={user}
        activeView={activeView}
        cartCount={cartSummary.soLuong}
        isDark={isDark}
        onNavigate={(nextView) => setView(nextView)}
        onToggleTheme={() => setIsDark((d) => !d)}
        onOpenAuth={() => setAuthOpen(true)}
        onLogout={handleLogout}
      />

      <main
        className={`${invoiceOrder ? 'no-print ' : ''}mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-9`}
      >
        {activeView === 'sanpham' && (
          <StorefrontView
            products={store.products}
            reviews={store.reviews}
            user={user}
            compareIds={compareIds}
            onToggleCompare={handleToggleCompare}
            onOpenCompareModal={() => setCompareOpen(true)}
            onClearCompare={() => setCompareIds([])}
            onOpenProductDetail={(sp) => setDetailProductMa(sp.ma)}
            onAddToCart={handleAddToCart}
            onRequireLogin={() => setAuthOpen(true)}
            onOpenProductModal={(sp) => setEditingProduct(sp)}
            onDeleteProduct={handleDeleteProduct}
            onQuickRestock={() => setView('nhaphang')}
          />
        )}

        {activeView === 'gio' && (
          <CartView
            user={user}
            cart={cartSummary}
            promos={store.promos}
            onUpdateQty={handleUpdateCartQty}
            onRemoveItem={handleRemoveCartItem}
            onPlaceOrder={handlePlaceOrder}
            onBrowseProducts={() => setView('sanpham')}
          />
        )}

        {activeView === 'donhang' && (
          <OrdersView
            user={user}
            orders={store.orders}
            onTransitionStatus={handleTransitionOrder}
            onPrintInvoice={(order) => setInvoiceOrder(order)}
            onOpenQr={(order) => setQrOrder(order)}
            onBrowseProducts={() => setView('sanpham')}
          />
        )}

        {activeView === 'khuyenmai' && canAccessView(user?.vaiTro, 'khuyenmai') && (
          <PromosView
            promos={store.promos}
            onSavePromo={handleSavePromo}
            onTogglePromo={handleTogglePromo}
            onDeletePromo={handleDeletePromo}
          />
        )}

        {activeView === 'nhaphang' && canAccessView(user?.vaiTro, 'nhaphang') && (
          <ImportView
            suppliers={store.suppliers}
            products={store.products}
            receipts={store.receipts}
            onAddSupplier={handleAddSupplier}
            onEditSupplier={(s) => setEditingSupplier(s)}
            onDeleteSupplier={handleDeleteSupplier}
            onCreateReceipt={handleCreateReceipt}
          />
        )}

        {activeView === 'thongke' && canAccessView(user?.vaiTro, 'thongke') && (
          <StatsView
            stats={storeStats}
            orders={store.orders}
            products={store.products}
            onQuickRestock={
              canAccessView(user?.vaiTro, 'nhaphang') ? () => setView('nhaphang') : undefined
            }
          />
        )}

        {activeView === 'nguoidung' && canAccessView(user?.vaiTro, 'nguoidung') && (
          <UsersView users={store.users} />
        )}

        {activeView === 'oracle' && canAccessView(user?.vaiTro, 'oracle') && (
          <OracleSqlView onNotify={(msg) => pushToast(msg)} />
        )}
      </main>

      <footer className="no-print border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-[#0B0F17] dark:text-slate-400">
        VPHONE · Hệ thống cửa hàng điện thoại, khuyến mãi & quản lý bán hàng
      </footer>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onLogin={handleLogin}
          onGoogleLogin={handleGoogleLogin}
          onRegister={handleRegister}
        />
      )}

      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          allProducts={store.products}
          reviews={store.reviews}
          user={user}
          onClose={() => setDetailProductMa(null)}
          onSelectProduct={(p) => setDetailProductMa(p.ma)}
          onAddToCart={handleAddToCart}
          onRequireLogin={() => {
            setDetailProductMa(null);
            setAuthOpen(true);
          }}
          onSubmitReview={handleSubmitReview}
        />
      )}

      {compareOpen && compareProducts.length >= 2 && (
        <CompareModal
          products={compareProducts}
          reviews={store.reviews}
          user={user}
          onClose={() => setCompareOpen(false)}
          onRemove={(ma) => {
            const next = compareIds.filter((id) => id !== ma);
            setCompareIds(next);
            if (next.length < 2) setCompareOpen(false);
          }}
          onAddToCart={handleAddToCart}
        />
      )}

      {invoiceOrder && (
        <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
      )}

      {qrOrder && (
        <PaymentQrModal order={qrOrder} onClose={() => setQrOrder(null)} />
      )}

      {editingProduct !== undefined && (
        <ProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(undefined)}
          onSave={handleSaveProduct}
        />
      )}

      {editingSupplier && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => setEditingSupplier(null)}
          onSave={handleSaveSupplier}
        />
      )}

      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
