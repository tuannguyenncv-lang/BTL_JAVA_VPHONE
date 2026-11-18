import { useCallback, useEffect, useMemo, useState } from 'react';
import { CartView } from './components/CartView';
import { CompareModal } from './components/CompareModal';
import { ImportView } from './components/ImportView';
import { InvoiceModal } from './components/InvoiceModal';
import {
  AuthModal,
  CancelOrderModal,
  ConfirmModal,
  ProductModal,
  SupplierModal,
  UserModal,
  VerifyPaymentModal,
  type UserSavePayload,
} from './components/Modals';
import { Navbar } from './components/Navbar';
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
  syncAdminUserUpdateToFirestore,
  syncGoogleUserProfile,
} from './firebase';
import {
  sendOrderConfirmationEmail,
  sendWelcomeEmail,
} from './services/emailClient';
import {
  getJavaToken,
  javaApi,
  saveOrderMeta,
  setJavaToken,
  type JavaServerInfo,
} from './services/javaApi';
import {
  addProductReview,
  addToCart,
  authenticateUser,
  confirmOrderPayment,
  createImportReceipt,
  createUserByAdmin,
  deleteProductByCode,
  deletePromoByCode,
  deleteSupplierByCode,
  loadSessionUser,
  loadStoreState,
  placeOrderFromCart,
  registerCustomer,
  removeFromCart,
  reportOrderTransfer,
  saveSessionUser,
  saveStoreState,
  togglePromoStatus,
  toggleUserLock,
  transitionOrderStatus,
  updateCartQuantity,
  updateUserByAdmin,
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
  User,
  ViewId,
} from './types/vphone';
import {
  ORDER_STATUS_LABELS,
  ROLE_LABELS,
  USER_STATUS_LABELS,
  buildCartSummary,
  canAccessView,
  computeStoreStats,
  evaluatePromoCode,
} from './utils/vphoneLogic';

function defaultViewForUser(u: SafeUser | null): ViewId {
  if (!u) return 'sanpham';
  if (u.vaiTro === 'QUAN_TRI' || u.vaiTro === 'NHAN_VIEN_BAN_HANG') return 'thongke';
  if (u.vaiTro === 'THU_KHO') return 'nhaphang';
  return 'sanpham';
}

export default function App() {
  const [store, setStore] = useState<StoreState>(() => loadStoreState());
  const [user, setUser] = useState<SafeUser | null>(null);
  const [view, setView] = useState<ViewId>('sanpham');
  const [javaInfo, setJavaInfo] = useState<JavaServerInfo | null>(null);

  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vphone_theme') === 'dark';
    } catch {
      return false;
    }
  });

  const [authOpen, setAuthOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined);
  const [editingUser, setEditingUser] = useState<User | null | undefined>(undefined);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [detailProductMa, setDetailProductMa] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [qrOrder, setQrOrder] = useState<Order | null>(null);
  const [cancelOrderTarget, setCancelOrderTarget] = useState<Order | null>(null);
  const [verifyPaymentOrder, setVerifyPaymentOrder] = useState<Order | null>(null);
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

  const syncFromJava = useCallback(
    async (activeUser: SafeUser | null) => {
      try {
        const products = await javaApi.getProducts();
        let nextCarts: StoreState['carts'] | undefined;
        let nextOrders: Order[] | undefined;
        let nextSuppliers: Supplier[] | undefined;
        let nextReceipts: StoreState['receipts'] | undefined;
        let nextUsers: User[] | undefined;

        if (activeUser?.vaiTro === 'KHACH_HANG') {
          const [cartLines, orders] = await Promise.all([
            javaApi.getCart(),
            javaApi.getOrders(),
          ]);
          nextCarts = { [activeUser.ma]: cartLines };
          nextOrders = orders;
        } else if (activeUser?.vaiTro === 'QUAN_TRI') {
          const [orders, suppliers, receipts, users] = await Promise.all([
            javaApi.getOrders(),
            javaApi.getSuppliers(),
            javaApi.getReceipts(),
            javaApi.getUsers(),
          ]);
          nextOrders = orders;
          nextSuppliers = suppliers;
          nextReceipts = receipts;
          nextUsers = users;
        }

        setStore((prev) => {
          const merged: StoreState = {
            ...prev,
            products,
            carts: nextCarts ? { ...prev.carts, ...nextCarts } : prev.carts,
            orders: nextOrders ?? prev.orders,
            suppliers: nextSuppliers ?? prev.suppliers,
            receipts: nextReceipts ?? prev.receipts,
            users: nextUsers ?? prev.users,
          };
          saveStoreState(merged);
          return merged;
        });
      } catch {
        // Fallback to local state if Java API is unavailable
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const info = await javaApi.getInfo();
        if (!active) return;
        setJavaInfo(info);
        let activeUser: SafeUser | null = null;
        if (getJavaToken()) {
          try {
            activeUser = await javaApi.getMe();
            if (active) {
              setUser(activeUser);
              setView(defaultViewForUser(activeUser));
            }
          } catch {
            setJavaToken(null);
          }
        }
        await syncFromJava(activeUser);
      } catch {
        // Running standalone without Java backend
      }
    })();
    return () => {
      active = false;
    };
  }, [syncFromJava]);

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
      const javaUser = await javaApi.googleLogin(
        fbUser.email,
        fbUser.displayName || fbUser.email.split('@')[0],
      );
      const mergedUser: SafeUser = {
        ...javaUser,
        avatarUrl: fbUser.photoURL || undefined,
        authProvider: 'GOOGLE',
        firebaseUid: fbUser.uid,
      };
      setUser(mergedUser);
      saveSessionUser(mergedUser.ma);
      await syncFromJava(mergedUser);
      if (options?.closeModal) {
        setAuthOpen(false);
        setView(defaultViewForUser(mergedUser));
      }
      if (options?.showWelcomeToast) {
        pushToast(
          `Chào mừng ${mergedUser.hoTen}!`,
          'ok',
          `Đăng nhập Google thành công · ${ROLE_LABELS[mergedUser.vaiTro]}`,
        );
      }
    },
    [pushToast, syncFromJava],
  );

  useEffect(() => {
    const unsubscribe = subscribeFirebaseAuth((fbUser) => {
      if (!fbUser || !fbUser.email) return;
      void applyFirebaseUserToStore(fbUser, { showWelcomeToast: false, closeModal: false }).catch(
        (err) => {
          pushToast(err instanceof Error ? err.message : 'Tài khoản đã bị khóa.', 'err');
        },
      );
    });
    return unsubscribe;
  }, [applyFirebaseUserToStore, pushToast]);

  const handleLogin = async (email: string, matKhau: string) => {
    const loggedIn = await javaApi.login(email, matKhau);
    setUser(loggedIn);
    saveSessionUser(loggedIn.ma);
    setAuthOpen(false);
    setView(defaultViewForUser(loggedIn));
    await syncFromJava(loggedIn);
    pushToast(
      `Chào mừng ${loggedIn.hoTen}!`,
      'ok',
      `Đăng nhập thành công · ${ROLE_LABELS[loggedIn.vaiTro]}`,
    );
  };

  const handleGoogleLogin = async () => {
    try {
      const fbUser = await signInWithGoogle();
      await applyFirebaseUserToStore(fbUser, { showWelcomeToast: true, closeModal: true });
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  };

  const handleRegister = async (input: {
    hoTen: string;
    email: string;
    matKhau: string;
    sdt: string;
    diaChi: string;
  }) => {
    const created = await javaApi.register(input);
    pushToast(`Đăng ký thành công, mã khách hàng: ${created.ma}`);
  };

  const handleLogout = () => {
    void signOutFromFirebase();
    void javaApi.logout();
    setUser(null);
    saveSessionUser(null);
    setView('sanpham');
    pushToast('Đã đăng xuất');
  };

  /* ---------------- Admin User & RBAC Handlers ---------------- */

  const handleSaveUser = (payload: UserSavePayload) => {
    if (payload.isEdit && payload.ma) {
      const { nextState, user: updated } = updateUserByAdmin(
        store,
        payload.ma,
        {
          hoTen: payload.hoTen,
          email: payload.email,
          matKhau: payload.matKhau,
          sdt: payload.sdt,
          vaiTro: payload.vaiTro,
          trangThai: payload.trangThai,
          diaChi: payload.diaChi,
          chucVu: payload.chucVu,
        },
        user?.ma,
      );
      commitStore(nextState);
      setEditingUser(undefined);
      void syncAdminUserUpdateToFirestore(updated.firebaseUid, updated.vaiTro, updated.trangThai);
      pushToast(`Đã cập nhật tài khoản ${updated.ma} (${ROLE_LABELS[updated.vaiTro]})`);
    } else {
      const { nextState, user: created } = createUserByAdmin(store, {
        hoTen: payload.hoTen,
        email: payload.email,
        matKhau: payload.matKhau || '',
        sdt: payload.sdt,
        vaiTro: payload.vaiTro,
        trangThai: payload.trangThai,
        diaChi: payload.diaChi,
        chucVu: payload.chucVu,
      });
      commitStore(nextState);
      setEditingUser(undefined);
      pushToast(`Đã tạo tài khoản ${created.ma} · ${ROLE_LABELS[created.vaiTro]}`);
    }
  };

  const handleToggleUserLock = (targetUser: User) => {
    const willLock = targetUser.trangThai !== 'BI_KHOA';
    const perform = () => {
      try {
        const { nextState, user: updated } = toggleUserLock(store, targetUser.ma, user?.ma);
        commitStore(nextState);
        void syncAdminUserUpdateToFirestore(updated.firebaseUid, updated.vaiTro, updated.trangThai);
        pushToast(
          `${updated.hoTen}: ${USER_STATUS_LABELS[updated.trangThai]}`,
        );
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái', 'err');
      }
    };

    if (willLock) {
      setConfirmState({
        title: 'Khóa tài khoản người dùng',
        message: `Khóa tài khoản "${targetUser.hoTen}" (${targetUser.email})? Người dùng sẽ không thể đăng nhập cho tới khi được mở khóa.`,
        confirmLabel: 'Khóa tài khoản',
        onConfirm: () => {
          setConfirmState(null);
          perform();
        },
      });
    } else {
      perform();
    }
  };

  /* ---------------- Product & Review Handlers ---------------- */

  const handleSaveProduct = async (payload: {
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
    try {
      if (payload.isEdit) {
        await javaApi.updateProduct(payload.ma, payload);
      } else {
        await javaApi.createProduct(payload);
      }
      await syncFromJava(user);
      setEditingProduct(undefined);
      pushToast(payload.isEdit ? 'Đã cập nhật sản phẩm' : `Đã thêm sản phẩm ${payload.ma.toUpperCase()}`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Lưu sản phẩm thất bại', 'err');
    }
  };

  const handleDeleteProduct = (sp: Product) => {
    setConfirmState({
      title: 'Xóa sản phẩm',
      message: `Xóa sản phẩm "${sp.ten}"? Hành động này không thể hoàn tác.`,
      confirmLabel: 'Xóa',
      onConfirm: async () => {
        try {
          await javaApi.deleteProduct(sp.ma);
          await syncFromJava(user);
          setCompareIds((prev) => prev.filter((id) => id !== sp.ma));
          setConfirmState(null);
          pushToast('Đã xóa sản phẩm');
        } catch (err) {
          setConfirmState(null);
          pushToast(err instanceof Error ? err.message : 'Xóa sản phẩm thất bại', 'err');
        }
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

  const handleAddToCart = async (sp: Product, qty: number) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    try {
      const items = await javaApi.addToCart(sp.ma, qty);
      commitStore({
        ...store,
        carts: { ...store.carts, [user.ma]: items },
      });
      pushToast(`Đã thêm "${sp.ten}" vào giỏ hàng`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể thêm vào giỏ', 'err');
    }
  };

  const handleUpdateCartQty = async (ma: string, qty: number) => {
    if (!user) return;
    try {
      const current = (store.carts[user.ma] || []).find((l) => l.ma === ma)?.soLuong || 0;
      let items;
      if (qty <= 0) {
        items = await javaApi.removeFromCart(ma);
      } else if (qty > current) {
        items = await javaApi.addToCart(ma, qty - current);
      } else if (qty < current) {
        await javaApi.removeFromCart(ma);
        items = await javaApi.addToCart(ma, qty);
      } else {
        return;
      }
      commitStore({
        ...store,
        carts: { ...store.carts, [user.ma]: items },
      });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể cập nhật số lượng', 'err');
    }
  };

  const handleRemoveCartItem = async (ma: string) => {
    if (!user) return;
    try {
      const items = await javaApi.removeFromCart(ma);
      commitStore({
        ...store,
        carts: { ...store.carts, [user.ma]: items },
      });
      pushToast('Đã xóa sản phẩm khỏi giỏ hàng');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể xóa khỏi giỏ hàng', 'err');
    }
  };

  const handlePlaceOrder = async (options: {
    promoCode?: string;
    paymentMethod: PaymentMethod;
  }) => {
    if (!user) return;
    try {
      let tienGiam = 0;
      let appliedCode: string | undefined;
      if (options.promoCode) {
        const promoObj = store.promos.find(
          (p) => p.ma.toUpperCase() === options.promoCode!.trim().toUpperCase(),
        );
        const promoEval = evaluatePromoCode(
          promoObj,
          cartSummary,
          new Date().toISOString().slice(0, 10),
        );
        if (!promoEval.valid) {
          pushToast(promoEval.error || 'Mã giảm giá không hợp lệ', 'err');
          return;
        }
        tienGiam = promoEval.discount;
        appliedCode = promoObj?.ma;
      }

      const created = await javaApi.placeOrder(options.paymentMethod);
      const tamTinh = created.tong;
      const tongSauGiam = Math.max(0, tamTinh - tienGiam);
      saveOrderMeta(created.ma, {
        phuongThucThanhToan: options.paymentMethod,
        trangThaiThanhToan: 'CHUA_THANH_TOAN',
        maGiamGia: appliedCode,
        tienGiam,
        tamTinh,
        tongSauGiam,
      });
      const order: Order = {
        ...created,
        phuongThucThanhToan: options.paymentMethod,
        trangThaiThanhToan: 'CHUA_THANH_TOAN',
        maGiamGia: appliedCode,
        tienGiam,
        tamTinh,
        tong: tongSauGiam,
      };
      await syncFromJava(user);
      setView('donhang');
      if (order.phuongThucThanhToan !== 'COD') {
        setQrOrder(order);
      }
      pushToast(`Đặt hàng thành công! Mã đơn: ${order.ma}`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Đặt hàng thất bại', 'err');
    }
  };

  const handleTransitionOrder = (order: Order, nextStatus: OrderStatus) => {
    if (!user) return;
    const canManageOrders = user.vaiTro === 'QUAN_TRI' || user.vaiTro === 'NHAN_VIEN_BAN_HANG';

    if (nextStatus === 'DA_HUY') {
      setCancelOrderTarget(order);
      return;
    }

    const perform = async () => {
      try {
        await javaApi.updateOrderStatus(order.ma, nextStatus);
        await syncFromJava(user);
        pushToast(`Đơn ${order.ma}: ${ORDER_STATUS_LABELS[nextStatus]}`);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'Cập nhật thất bại', 'err');
      }
    };

    const payState = order.trangThaiThanhToan || 'CHUA_THANH_TOAN';
    if (
      canManageOrders &&
      nextStatus === 'DANG_GIAO' &&
      order.phuongThucThanhToan !== 'COD' &&
      payState !== 'DA_THANH_TOAN'
    ) {
      pushToast(
        'Chưa thể chuyển sang Đang giao',
        'err',
        `Đơn ${order.ma} thanh toán qua chuyển khoản/ví nhưng Admin chưa xác nhận đã nhận tiền. Vui lòng bấm "Xác nhận tiền" trước.`,
      );
      return;
    }

    perform();
  };

  const handleConfirmCancelOrder = async (reason: string) => {
    if (!user || !cancelOrderTarget) return;
    try {
      await javaApi.updateOrderStatus(cancelOrderTarget.ma, 'DA_HUY');
      saveOrderMeta(cancelOrderTarget.ma, {
        lyDoHuy: reason,
        nguoiHuy: user.hoTen,
        ngayHuy: new Date().toISOString().slice(0, 10),
      });
      await syncFromJava(user);
      pushToast(`Đã hủy đơn ${cancelOrderTarget.ma}`, 'ok', `Lý do: ${reason}`);
      setCancelOrderTarget(null);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể hủy đơn hàng', 'err');
    }
  };

  const handleReportTransferred = async (order: Order, maGiaoDich: string) => {
    if (!user) return;
    try {
      const updated = await javaApi.reportTransfer(order.ma, maGiaoDich.trim().toUpperCase());
      const ref = updated.maGiaoDich || maGiaoDich.trim().toUpperCase() || `CK-${order.ma}`;
      saveOrderMeta(order.ma, {
        trangThaiThanhToan: 'CHO_XAC_NHAN',
        maGiaoDich: ref,
        ngayBaoChuyenKhoan: new Date().toISOString().slice(0, 10),
      });
      await syncFromJava(user);
      setQrOrder(null);
      pushToast(
        `Đã gửi xác nhận chuyển khoản đơn ${order.ma}`,
        'ok',
        `Mã GD: ${ref} · Cửa hàng sẽ kiểm tra sao kê và xác nhận.`,
      );
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể ghi nhận chuyển khoản', 'err');
    }
  };

  const handleConfirmPaymentReceived = async (maGiaoDich: string) => {
    if (!user || !verifyPaymentOrder) return;
    try {
      const ref = maGiaoDich.trim().toUpperCase();
      await javaApi.confirmPayment(verifyPaymentOrder.ma, ref);
      saveOrderMeta(verifyPaymentOrder.ma, {
        trangThaiThanhToan: 'DA_THANH_TOAN',
        maGiaoDich: ref,
        ngayXacNhanThanhToan: new Date().toISOString().slice(0, 10),
        nguoiXacNhanThanhToan: user.hoTen,
      });
      await syncFromJava(user);
      pushToast(
        `Đã xác nhận nhận tiền đơn ${verifyPaymentOrder.ma}`,
        'ok',
        `Mã GD đối soát: ${ref}`,
      );
      setVerifyPaymentOrder(null);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể xác nhận thanh toán', 'err');
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

  const handleAddSupplier = async (supplier: Supplier) => {
    try {
      await javaApi.createSupplier(supplier);
      await syncFromJava(user);
      pushToast('Đã thêm nhà cung cấp');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể thêm nhà cung cấp', 'err');
    }
  };

  const handleSaveSupplier = async (supplier: Supplier) => {
    try {
      await javaApi.updateSupplier(supplier);
      await syncFromJava(user);
      setEditingSupplier(null);
      pushToast('Đã cập nhật nhà cung cấp');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể cập nhật nhà cung cấp', 'err');
    }
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setConfirmState({
      title: 'Xóa nhà cung cấp',
      message: `Xóa nhà cung cấp "${supplier.ten}"? Nếu đã có phiếu nhập, thao tác sẽ bị từ chối.`,
      confirmLabel: 'Xóa',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await javaApi.deleteSupplier(supplier.ma);
          await syncFromJava(user);
          pushToast('Đã xóa nhà cung cấp');
        } catch (err) {
          pushToast(err instanceof Error ? err.message : 'Không thể xóa nhà cung cấp', 'err');
        }
      },
    });
  };

  const handleCreateReceipt = async (
    maNCC: string,
    lines: { ma: string; soLuong: number; giaNhap: number }[],
  ) => {
    try {
      const receipt = await javaApi.createReceipt(maNCC, lines);
      await syncFromJava(user);
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
            onVerifyPayment={(order) => setVerifyPaymentOrder(order)}
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
          <UsersView
            users={store.users}
            currentAdminMa={user?.ma}
            onOpenUserModal={(u) => setEditingUser(u)}
            onToggleUserLock={handleToggleUserLock}
          />
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

      {editingUser !== undefined && (
        <UserModal
          user={editingUser}
          currentAdminMa={user?.ma}
          onClose={() => setEditingUser(undefined)}
          onSave={handleSaveUser}
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
        <InvoiceModal
          order={invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
          onNotify={pushToast}
        />
      )}

      {qrOrder && (
        <PaymentQrModal
          order={qrOrder}
          onReportTransferred={handleReportTransferred}
          onClose={() => setQrOrder(null)}
        />
      )}

      {cancelOrderTarget && (
        <CancelOrderModal
          order={cancelOrderTarget}
          isStaff={user?.vaiTro === 'QUAN_TRI' || user?.vaiTro === 'NHAN_VIEN_BAN_HANG'}
          onConfirm={handleConfirmCancelOrder}
          onCancel={() => setCancelOrderTarget(null)}
        />
      )}

      {verifyPaymentOrder && (
        <VerifyPaymentModal
          order={verifyPaymentOrder}
          onConfirm={handleConfirmPaymentReceived}
          onClose={() => setVerifyPaymentOrder(null)}
        />
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
