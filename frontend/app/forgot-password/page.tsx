import WarehousePanel from '@/components/auth/WarehousePanel';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import styles from '../login/page.module.css';

export default function ForgotPasswordPage() {
  return (
    <div className={styles.root}>
      <WarehousePanel />
      <div className={styles.formSide}>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
