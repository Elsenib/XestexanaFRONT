import { useState } from "react";
import { LOCALES, type Locale, useLocale } from "./LocaleProvider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://xestexana.live/api';

type SubscriptionPlan = "basic" | "professional" | "enterprise";

interface SubscriptionPlanData {
  name: string;
  price: number;
  maxUsers: number;
  maxPatients: number;
  features: string[];
}

const subscriptionPlans: Record<SubscriptionPlan, SubscriptionPlanData> = {
  basic: {
    name: "Temel Paket",
    price: 300,
    maxUsers: 5,
    maxPatients: 100,
    features: ["Hasta yönetimi", "Temel raporlar", "5 kullanıcı", "E-posta desteği"]
  },
  professional: {
    name: "Profesyonel Paket",
    price: 500,
    maxUsers: 15,
    maxPatients: 500,
    features: ["Tüm temel özellikler", "Gelişmiş raporlar", "15 kullanıcı", "API erişimi", "Telefon desteği"]
  },
  enterprise: {
    name: "Kurumsal Paket",
    price: 800,
    maxUsers: 50,
    maxPatients: 2000,
    features: ["Tüm özellikler", "Özel geliştirme", "50 kullanıcı", "7/24 destek", "Öncelikli özellik geliştirme"]
  }
};

interface ClinicSubscriptionData {
  clinic: {
    id: string;
    name: string;
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionStart: string | null;
    subscriptionEnd: string | null;
    maxUsers: number;
    maxPatients: number;
  };
  plan: SubscriptionPlanData;
  usage: {
    currentUsers: number;
    currentPatients: number;
    userLimit: number;
    patientLimit: number;
  };
}

export function SubscriptionManager() {
  const [clinicData, setClinicData] = useState<ClinicSubscriptionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { t } = useLocale();

  const loadSubscriptionData = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("hospital_portal_token");
      if (!token) {
        setError("Giriş yapmanız gerekiyor.");
        return;
      }

      // JWT'den clinicId'yi decode et
      const payload = JSON.parse(atob(token.split('.')[1]));
      const clinicId = payload.clinicId;

      if (!clinicId) {
        setError("Klinik bilgisi bulunamadı.");
        return;
      }

      const response = await fetch(`${API_BASE}/subscription/clinic/${clinicId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Abonelik bilgileri yüklenemedi.");
      }

      const data = await response.json();
      setClinicData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const createClinicWithSubscription = async (plan: SubscriptionPlan) => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const clinicName = prompt("Klinik adı:");
      const adminEmail = prompt("Admin e-posta:");
      const adminPassword = prompt("Admin şifre (min 8 karakter):");

      if (!clinicName || !adminEmail || !adminPassword) {
        setError("Tüm alanları doldurun.");
        return;
      }

      const response = await fetch(`${API_BASE}/subscription/create-clinic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: clinicName,
          adminEmail,
          adminPassword,
          subscriptionPlan: plan
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Klinik oluşturulamadı.");
      }

      const data = await response.json();
      setMessage(`Klinik başarıyla oluşturuldu! Admin: ${data.admin.email}`);
      setClinicData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-600";
      case "trial": return "text-blue-600";
      case "expired": return "text-red-600";
      case "cancelled": return "text-gray-600";
      default: return "text-gray-600";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Aktif";
      case "trial": return "Deneme";
      case "expired": return "Süresi Dolmuş";
      case "cancelled": return "İptal Edilmiş";
      default: return status;
    }
  };

  return (
    <div className="subscription-manager">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Abonelik Yönetimi</span>
          <h2>Klinik Abonelik Sistemi</h2>
        </div>
      </div>

      {message && <p className="status-ok">{message}</p>}
      {error && <p className="status-error">{error}</p>}

      {!clinicData ? (
        <div className="subscription-plans">
          <h3>Abonelik Paketleri</h3>
          <div className="plans-grid">
            {Object.entries(subscriptionPlans).map(([key, plan]) => (
              <div key={key} className="plan-card">
                <h4>{plan.name}</h4>
                <div className="plan-price">{plan.price} AZN/ay</div>
                <ul className="plan-features">
                  {plan.features.map((feature, index) => (
                    <li key={index}>✓ {feature}</li>
                  ))}
                </ul>
                <div className="plan-limits">
                  <div>Kullanıcı: {plan.maxUsers}</div>
                  <div>Hasta: {plan.maxPatients}</div>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => createClinicWithSubscription(key as SubscriptionPlan)}
                  disabled={loading}
                >
                  {loading ? "Oluşturuluyor..." : "Klinik Oluştur"}
                </button>
              </div>
            ))}
          </div>

          <div className="existing-clinic">
            <h3>Zaten Klinikiniz Var mı?</h3>
            <button
              type="button"
              className="secondary-button"
              onClick={loadSubscriptionData}
              disabled={loading}
            >
              Abonelik Bilgilerini Yükle
            </button>
          </div>
        </div>
      ) : (
        <div className="subscription-details">
          <div className="clinic-info">
            <h3>{clinicData.clinic.name}</h3>
            <div className="status-info">
              <span className={`status ${getStatusColor(clinicData.clinic.subscriptionStatus)}`}>
                {getStatusText(clinicData.clinic.subscriptionStatus)}
              </span>
              <span className="plan-name">{clinicData.plan.name}</span>
            </div>
          </div>

          <div className="usage-stats">
            <h4>Kullanım İstatistikleri</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">Kullanıcılar</div>
                <div className="stat-value">
                  {clinicData.usage.currentUsers} / {clinicData.usage.userLimit}
                </div>
                <div className="stat-bar">
                  <div
                    className="stat-fill"
                    style={{
                      width: `${(clinicData.usage.currentUsers / clinicData.usage.userLimit) * 100}%`
                    }}
                  />
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-label">Hastalar</div>
                <div className="stat-value">
                  {clinicData.usage.currentPatients} / {clinicData.usage.patientLimit}
                </div>
                <div className="stat-bar">
                  <div
                    className="stat-fill"
                    style={{
                      width: `${(clinicData.usage.currentPatients / clinicData.usage.patientLimit) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="subscription-info">
            <h4>Abonelik Bilgileri</h4>
            <div className="info-grid">
              <div>
                <span>Paket:</span>
                <strong>{clinicData.plan.name}</strong>
              </div>
              <div>
                <span>Aylık Ücret:</span>
                <strong>{clinicData.plan.price} AZN</strong>
              </div>
              {clinicData.clinic.subscriptionEnd && (
                <div>
                  <span>Bitiş Tarihi:</span>
                  <strong>{new Date(clinicData.clinic.subscriptionEnd).toLocaleDateString('tr-TR')}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="plan-features">
            <h4>Paket Özellikleri</h4>
            <ul>
              {clinicData.plan.features.map((feature, index) => (
                <li key={index}>✓ {feature}</li>
              ))}
            </ul>
          </div>

          <div className="subscription-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setClinicData(null)}
            >
              Paketleri Görüntüle
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => alert("Ödeme sistemi yakında eklenecek. Şimdilik manuel işlem.")}
            >
              Abonelik Yenile
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .subscription-manager {
          padding: 20px;
        }

        .subscription-plans {
          margin-top: 20px;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }

        .plan-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }

        .plan-price {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
          margin: 10px 0;
        }

        .plan-features {
          list-style: none;
          padding: 0;
          margin: 15px 0;
        }

        .plan-features li {
          margin: 5px 0;
          text-align: left;
        }

        .plan-limits {
          background: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
          margin: 15px 0;
        }

        .existing-clinic {
          margin-top: 30px;
          padding: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          text-align: center;
        }

        .subscription-details {
          margin-top: 20px;
        }

        .clinic-info {
          margin-bottom: 30px;
        }

        .status-info {
          display: flex;
          gap: 15px;
          margin-top: 10px;
        }

        .status {
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: bold;
        }

        .usage-stats {
          margin-bottom: 30px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 15px;
        }

        .stat-item {
          padding: 15px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
        }

        .stat-label {
          font-weight: bold;
          margin-bottom: 10px;
        }

        .stat-value {
          font-size: 18px;
          margin-bottom: 10px;
        }

        .stat-bar {
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }

        .stat-fill {
          height: 100%;
          background: #2563eb;
          transition: width 0.3s ease;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-top: 15px;
        }

        .info-grid > div {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .plan-features ul {
          list-style: none;
          padding: 0;
        }

        .plan-features li {
          margin: 5px 0;
        }

        .subscription-actions {
          margin-top: 30px;
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .primary-button {
          background: #2563eb;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
        }

        .primary-button:hover {
          background: #1d4ed8;
        }

        .primary-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .secondary-button {
          background: white;
          color: #2563eb;
          border: 1px solid #2563eb;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
        }

        .secondary-button:hover {
          background: #f8f9fa;
        }

        .status-ok {
          color: #059669;
          background: #ecfdf5;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
        }

        .status-error {
          color: #dc2626;
          background: #fef2f2;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
        }
      `}</style>
    </div>
  );
}