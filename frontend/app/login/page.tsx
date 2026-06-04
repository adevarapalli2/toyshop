import WarehousePanel from '@/components/auth/WarehousePanel';
import LoginForm from '@/components/auth/LoginForm';
import styles from './page.module.css';

export default function LoginPage() {
  return (
    <div className={styles.root}>
      <WarehousePanel />
      <div className={styles.formSide}>
        <LoginForm />
      </div>
    </div>
  );
}
