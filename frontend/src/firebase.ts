import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { UserRole, UserStatus } from './types/vphone';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'thedeadgiants.official@gmail.com';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export async function signInWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signOutFromFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // Ignore signout errors when not logged in
  }
}

export function subscribeFirebaseAuth(
  cb: (user: FirebaseUser | null) => void,
): () => void {
  return onAuthStateChanged(auth, cb);
}

export async function syncGoogleUserProfile(
  fbUser: FirebaseUser,
  defaultMa: string,
  defaultRole: UserRole,
): Promise<{ ma: string; vaiTro: UserRole; trangThai: UserStatus }> {
  const userPath = `users/${fbUser.uid}`;
  const userRef = doc(db, 'users', fbUser.uid);

  const isBootAdmin =
    Boolean(fbUser.emailVerified) &&
    (fbUser.email || '').toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userPath);
  }

  if (snap.exists()) {
    const data = snap.data() as {
      ma?: string;
      vaiTro?: UserRole;
      trangThai?: UserStatus;
      hoTen?: string;
      photoUrl?: string;
      email?: string;
    };
    const resolvedStatus: UserStatus = data.trangThai === 'BI_KHOA' ? 'BI_KHOA' : 'HOAT_DONG';
    const resolvedRole: UserRole =
      data.vaiTro || (isBootAdmin ? 'QUAN_TRI' : defaultRole);
    const resolvedMa = data.ma || defaultMa;

    if (resolvedStatus === 'HOAT_DONG') {
      const nextName = fbUser.displayName || data.hoTen || fbUser.email?.split('@')[0] || 'Khách hàng';
      const nextEmail = fbUser.email || data.email || '';
      const nextPhoto = fbUser.photoURL || data.photoUrl;
      if (nextName !== data.hoTen || nextEmail !== data.email || nextPhoto !== data.photoUrl) {
        try {
          await updateDoc(userRef, {
            hoTen: nextName,
            email: nextEmail,
            ...(nextPhoto ? { photoUrl: nextPhoto } : {}),
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Non-fatal profile refresh error
        }
      }
    }

    return { ma: resolvedMa, vaiTro: resolvedRole, trangThai: resolvedStatus };
  }

  const initialRole: UserRole = isBootAdmin ? 'QUAN_TRI' : defaultRole;
  const profilePayload: Record<string, unknown> = {
    uid: fbUser.uid,
    ma: defaultMa,
    hoTen: fbUser.displayName || fbUser.email?.split('@')[0] || 'Khách hàng',
    email: fbUser.email || '',
    vaiTro: initialRole,
    trangThai: 'HOAT_DONG',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (fbUser.photoURL) {
    profilePayload.photoUrl = fbUser.photoURL;
  }

  try {
    await setDoc(userRef, profilePayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, userPath);
  }

  if (isBootAdmin) {
    const adminPath = `admins/${fbUser.uid}`;
    try {
      await setDoc(doc(db, 'admins', fbUser.uid), {
        uid: fbUser.uid,
        email: fbUser.email || '',
        createdAt: serverTimestamp(),
      });
    } catch {
      // Bootstrapped admin already satisfies isBootstrappedAdmin() in rules
      void adminPath;
    }
  }

  return { ma: defaultMa, vaiTro: initialRole, trangThai: 'HOAT_DONG' };
}

export async function syncAdminUserUpdateToFirestore(
  firebaseUid: string | undefined,
  vaiTro: UserRole,
  trangThai: UserStatus,
): Promise<void> {
  if (!firebaseUid || !auth.currentUser) return;
  const userPath = `users/${firebaseUid}`;
  try {
    await updateDoc(doc(db, 'users', firebaseUid), {
      vaiTro,
      trangThai,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Only succeeds when current user is an authenticated Firebase Admin; ignore for local-only admins
    void userPath;
  }
}

export function mapFirebaseAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Bạn đã đóng cửa sổ đăng nhập Google.';
    case 'auth/popup-blocked':
      return 'Trình duyệt đã chặn cửa sổ bật lên. Vui lòng cho phép popup để đăng nhập Google.';
    case 'auth/cancelled-popup-request':
      return 'Yêu cầu đăng nhập bị hủy bởi thao tác mới hơn.';
    case 'auth/network-request-failed':
      return 'Lỗi kết nối mạng khi liên hệ Google / Firebase.';
    case 'auth/unauthorized-domain':
      return 'Tên miền hiện tại (localhost:8080) chưa được cấp quyền trong Firebase Console. Bạn có thể thêm localhost vào Authorized domains hoặc dùng tài khoản đăng nhập trực tiếp bên dưới.';
    default:
      return err instanceof Error ? err.message : 'Đăng nhập bằng Google thất bại.';
  }
}
