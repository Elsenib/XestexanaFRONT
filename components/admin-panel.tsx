"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useLocale } from "./LocaleProvider";

import type { AppointmentSummary } from "@hospital/shared";

type MetricState = {
  totalRequests: number;
  totalErrors: number;
  averageResponseMs: number;
  p95ResponseMs: number;
};

type PatientRow = {
  id: string;
  fullName: string;
  identityNumber: string;
  phone: string;
};

type DoctorRow = {
  id: string;
  fullName: string;
  branch: string;
  roomNumber?: string | null;
  active: boolean;
};

type NurseRow = {
  id: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
};

type AdminUserRow = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://xestexana.live/api";

function toIsoLocalDateTimeInput(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDate(dateIso: string) {
  return new Intl.DateTimeFormat("az-Latn-AZ", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(dateIso));
}

function statusLabel(status: AppointmentSummary["status"], t: (key: string, fallback?: string) => string) {
  return t(`status.${status}`, status);
}

function channelLabel(channel: string, t: (key: string, fallback?: string) => string) {
  return t(`channel.${channel}`, channel);
}

export function AdminPanel() {
  const { t } = useLocale();
  const [token, setToken] = useState<string>("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [globalMessage, setGlobalMessage] = useState("");
  const [globalError, setGlobalError] = useState("");

  const [metrics, setMetrics] = useState<MetricState>({
    totalRequests: 0,
    totalErrors: 0,
    averageResponseMs: 0,
    p95ResponseMs: 0
  });
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [nurses, setNurses] = useState<NurseRow[]>([]);

  const [bootstrapSetupKey, setBootstrapSetupKey] = useState("");
  const [bootstrapEmail, setBootstrapEmail] = useState("admin@hospital.local");
  const [bootstrapPassword, setBootstrapPassword] = useState("Admin12345!");

  const [loginEmail, setLoginEmail] = useState("admin@hospital.local");
  const [loginPassword, setLoginPassword] = useState("Admin12345!");

  const [patientForm, setPatientForm] = useState({
    email: "",
    password: "",
    identityNumber: "",
    firstName: "",
    lastName: "",
    phone: "",
    gender: "FEMALE",
    birthDate: "1990-01-01"
  });

  const [doctorForm, setDoctorForm] = useState({
    email: "",
    password: "",
    title: "Dr.",
    firstName: "",
    lastName: "",
    branch: "",
    roomNumber: ""
  });

  const [appointmentForm, setAppointmentForm] = useState({
    patientId: "",
    doctorId: "",
    startsAt: toIsoLocalDateTimeInput(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    endsAt: toIsoLocalDateTimeInput(new Date(Date.now() + (24 * 60 + 20) * 60 * 1000)),
    channel: "web",
    notes: ""
  });

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }),
    [token]
  );

  const loadData = useCallback(async () => {
    if (!token) {
      return;
    }

    setGlobalError("");
    const startDate = new Date();
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
      const [metricsRes, meRes, appointmentsRes, patientsRes, doctorsRes, adminUsersRes, nursesRes] = await Promise.all([
        fetch(`${API_BASE}/observability/metrics`),
        fetch(`${API_BASE}/auth/me`, { headers: authHeaders }),
        fetch(
          `${API_BASE}/appointments/availability?startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`,
          { headers: authHeaders }
        ),
        fetch(`${API_BASE}/patients`, { headers: authHeaders }),
        fetch(`${API_BASE}/doctors`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin-users`, { headers: authHeaders }),
        fetch(`${API_BASE}/nurses`, { headers: authHeaders })
      ]);

      if (metricsRes.ok) {
        const m = await metricsRes.json();
        setMetrics({
          totalRequests: m.totalRequests ?? 0,
          totalErrors: m.totalErrors ?? 0,
          averageResponseMs: m.averageResponseMs ?? 0,
          p95ResponseMs: m.p95ResponseMs ?? 0
        });
      }

      if (meRes.ok) {
        const me = await meRes.json();
        setUserEmail(me?.email ?? "");
        setUserRole(me?.role ?? "");
      }

      if (appointmentsRes.ok) {
        setAppointments(await appointmentsRes.json());
      }

      if (patientsRes.ok) {
        const patientData = await patientsRes.json();
        setPatients(patientData);
        if (!appointmentForm.patientId && patientData.length > 0) {
          setAppointmentForm((prev) => ({ ...prev, patientId: patientData[0].id }));
        }
      }

      if (doctorsRes.ok) {
        const doctorData = await doctorsRes.json();
        setDoctors(doctorData);
        if (!appointmentForm.doctorId && doctorData.length > 0) {
          setAppointmentForm((prev) => ({ ...prev, doctorId: doctorData[0].id }));
        }
      }

      if (adminUsersRes.ok) {
        setAdminUsers(await adminUsersRes.json());
      }

      if (nursesRes.ok) {
        setNurses(await nursesRes.json());
      }
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : t("messages.unknownError"));
    }
  }, [appointmentForm.doctorId, appointmentForm.patientId, authHeaders, token]);

  useEffect(() => {
    const savedToken = globalThis.localStorage?.getItem("hospital_admin_token") ?? "";
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      globalThis.localStorage?.setItem("hospital_admin_token", token);
      void loadData();
    }
  }, [loadData, token]);

  async function doBootstrapAdmin() {
    setGlobalMessage("");
    setGlobalError("");

    const response = await fetch(`${API_BASE}/auth/bootstrap-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setupKey: bootstrapSetupKey,
        email: bootstrapEmail,
        password: bootstrapPassword
      })
    });

    if (!response.ok) {
      const error = await response.json();
      setGlobalError(error?.message ?? "Admin yaradılması mümkün olmadı.");
      return;
    }

    setGlobalMessage(t("messages.adminAccountCreated"));
  }

  async function doLogin() {
    setGlobalMessage("");
    setGlobalError("");

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword })
    });

    if (!response.ok) {
      const error = await response.json();
      setGlobalError(error?.message ?? "Giriş uğursuz oldu.");
      return;
    }

    const payload = await response.json();
    setToken(payload.token);
    setGlobalMessage(t("messages.loginSuccess"));
  }

  async function createPatient() {
    setGlobalMessage("");
    setGlobalError("");

    const response = await fetch(`${API_BASE}/patients`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        ...patientForm,
        birthDate: new Date(`${patientForm.birthDate}T00:00:00.000Z`).toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      setGlobalError(error?.message ?? "Pasiyent yaradılmadı.");
      return;
    }

    setGlobalMessage(t("messages.patientAdded"));
    setPatientForm({
      email: "",
      password: "",
      identityNumber: "",
      firstName: "",
      lastName: "",
      phone: "",
      gender: "FEMALE",
      birthDate: "1990-01-01"
    });
    await loadData();
  }

  async function createDoctor() {
    setGlobalMessage("");
    setGlobalError("");

    const response = await fetch(`${API_BASE}/doctors`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        ...doctorForm,
        roomNumber: doctorForm.roomNumber || undefined,
        active: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      setGlobalError(error?.message ?? "Həkim yaradılmadı.");
      return;
    }

    setGlobalMessage(t("messages.doctorAdded"));
    setDoctorForm({
      email: "",
      password: "",
      title: "Dr.",
      firstName: "",
      lastName: "",
      branch: "",
      roomNumber: ""
    });
    await loadData();
  }

  async function createAppointment() {
    setGlobalMessage("");
    setGlobalError("");

    const response = await fetch(`${API_BASE}/appointments`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        ...appointmentForm,
        startsAt: new Date(appointmentForm.startsAt).toISOString(),
        endsAt: new Date(appointmentForm.endsAt).toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      setGlobalError(error?.message ?? "Randevu yaradılmadı.");
      return;
    }

    setGlobalMessage(t("messages.appointmentCreated"));
    await loadData();
  }

  async function createAdminUser() {
    setGlobalMessage("");
    setGlobalError("");

    const response = await fetch(`${API_BASE}/admin-users`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        email: bootstrapEmail,
        password: bootstrapPassword,
        role: "CALL_CENTER"
      })
    });

    if (!response.ok) {
      const error = await response.json();
      setGlobalError(error?.message ?? "Admin istifadəçi yaradılmadı.");
      return;
    }

    setGlobalMessage(t("messages.callCenterUserCreated"));
    await loadData();
  }

  async function deleteDoctor(id: string) {
    if (!confirm("Bu hekimi silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarıl bilməz.")) {
      return;
    }

    setGlobalMessage("");
    setGlobalError("");

    const response = await fetch(`${API_BASE}/doctors/${id}`, {
      method: "DELETE",
      headers: authHeaders
    });

    if (!response.ok) {
      const error = await response.json();
      setGlobalError(error?.message ?? "Həkim silinmədi.");
      return;
    }

    setGlobalMessage(t("messages.doctorDeleted"));
    await loadData();
  }

  async function deleteNurse(id: string) {
    if (!confirm("Bu hemşirəni silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarıl bilməz.")) {
      return;
    }

    setGlobalMessage("");
    setGlobalError("");

    const response = await fetch(`${API_BASE}/nurses/${id}`, {
      method: "DELETE",
      headers: authHeaders
    });

    if (!response.ok) {
      const error = await response.json();
      setGlobalError(error?.message ?? "Hemşire silinmədi.");
      return;
    }

    setGlobalMessage(t("messages.nurseDeleted"));
    await loadData();
  }

  if (!token) {
    return (
      <main className="admin-shell">
        <section className="dashboard">
          <article className="panel-card auth-card">
            <span className="eyebrow">Admin girişi</span>
            <h1>Canlı admin panel üçün giriş edin</h1>
            <p>İlk dəfə istifadə edirsinizsə əvvəl admin bootstrap edin, sonra login ilə token alın.</p>

            <div className="form-grid single">
              <label>
                Qurulum açarı
                <input value={bootstrapSetupKey} onChange={(e) => setBootstrapSetupKey(e.target.value)} />
              </label>
              <label>
                Admin e-poçtu
                <input value={bootstrapEmail} onChange={(e) => setBootstrapEmail(e.target.value)} />
              </label>
              <label>
                Admin şifrəsi
                <input
                  type="password"
                  value={bootstrapPassword}
                  onChange={(e) => setBootstrapPassword(e.target.value)}
                />
              </label>
              <button type="button" onClick={() => void doBootstrapAdmin()}>
                Bootstrap admin yarat
              </button>
            </div>

            <div className="form-grid single">
              <label>
                Login e-poçt
                <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
              </label>
              <label>
                Login şifrə
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
              </label>
              <button type="button" onClick={() => void doLogin()}>
                Giriş et
              </button>
            </div>

            {globalMessage ? <p className="status-ok">{globalMessage}</p> : null}
            {globalError ? <p className="status-error">{globalError}</p> : null}
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">HP</span>
          <div>
            <strong>Hospital Platform</strong>
            <p>Admin idarəetmə mərkəzi</p>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Admin menyusu">
          <a href="#dashboard" className="active">
            Dashboard
          </a>
          <a href="#patients">Pasiyent qeydiyyatı</a>
          <a href="#appointments">Randevular</a>
          <a href="#doctors">Həkim planlaması</a>
          <a href="#nurses">Hemşire idarəsi</a>
          <a href="#reports">Admin istifadəçilər</a>
        </nav>

        <div className="sidebar-card">
          <span className="eyebrow">Aktiv istifadəçi</span>
          <strong>{userEmail || "Naməlum"}</strong>
          <p>Rol: {userRole || "-"}</p>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              globalThis.localStorage?.removeItem("hospital_admin_token");
              setToken("");
            }}
          >
            Çıxış et
          </button>
        </div>
      </aside>

      <section className="dashboard" id="dashboard">
        <header className="topbar">
          <div>
            <span className="eyebrow">Canlı API ilə inteqrasiya</span>
            <h1>Admin panel real verilənlərlə işləyir</h1>
            <p>Bu ekran JWT token ilə qorunan backend endpoint-lərindən real data çəkir və form submit edir.</p>
          </div>
          <div className="topbar-actions">
            <button type="button" onClick={() => void loadData()}>
              Yenilə
            </button>
          </div>
        </header>

        {globalMessage ? <p className="status-ok">{globalMessage}</p> : null}
        {globalError ? <p className="status-error">{globalError}</p> : null}

        <section className="metrics-grid">
          <article className="metric-card">
            <span>Toplam sorğu</span>
            <strong>{metrics.totalRequests}</strong>
            <p>Monitoring endpoint-dən alınır</p>
          </article>
          <article className="metric-card">
            <span>Toplam xəta</span>
            <strong>{metrics.totalErrors}</strong>
            <p>Server error tracking statistikası</p>
          </article>
          <article className="metric-card">
            <span>Orta cavab müddəti</span>
            <strong>{metrics.averageResponseMs} ms</strong>
            <p>Canlı response time ölçümü</p>
          </article>
          <article className="metric-card">
            <span>P95 cavab müddəti</span>
            <strong>{metrics.p95ResponseMs} ms</strong>
            <p>Yüklənmə performans indikatoru</p>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel-card" id="patients">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Pasiyent qeydiyyatı</span>
                <h2>Yeni pasiyent yarat</h2>
              </div>
            </div>

            <div className="form-grid">
              <label>
                E-poçt
                <input
                  value={patientForm.email}
                  onChange={(e) => setPatientForm((p) => ({ ...p, email: e.target.value }))}
                />
              </label>
              <label>
                Şifrə
                <input
                  type="password"
                  value={patientForm.password}
                  onChange={(e) => setPatientForm((p) => ({ ...p, password: e.target.value }))}
                />
              </label>
              <label>
                Şəxsiyyət nömrəsi
                <input
                  value={patientForm.identityNumber}
                  onChange={(e) => setPatientForm((p) => ({ ...p, identityNumber: e.target.value }))}
                />
              </label>
              <label>
                Ad
                <input
                  value={patientForm.firstName}
                  onChange={(e) => setPatientForm((p) => ({ ...p, firstName: e.target.value }))}
                />
              </label>
              <label>
                Soyad
                <input
                  value={patientForm.lastName}
                  onChange={(e) => setPatientForm((p) => ({ ...p, lastName: e.target.value }))}
                />
              </label>
              <label>
                Telefon
                <input
                  value={patientForm.phone}
                  onChange={(e) => setPatientForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </label>
              <label>
                Cins
                <select
                  value={patientForm.gender}
                  onChange={(e) => setPatientForm((p) => ({ ...p, gender: e.target.value }))}
                >
                  <option value="FEMALE">Qadın</option>
                  <option value="MALE">Kişi</option>
                  <option value="OTHER">Digər</option>
                </select>
              </label>
              <label>
                Doğum tarixi
                <input
                  type="date"
                  value={patientForm.birthDate}
                  onChange={(e) => setPatientForm((p) => ({ ...p, birthDate: e.target.value }))}
                />
              </label>
            </div>

            <button type="button" onClick={() => void createPatient()}>
              Pasiyent əlavə et
            </button>
          </article>

          <article className="panel-card" id="doctors">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Həkim idarəsi</span>
                <h2>Yeni həkim yarat</h2>
              </div>
            </div>

            <div className="form-grid">
              <label>
                E-poçt
                <input
                  value={doctorForm.email}
                  onChange={(e) => setDoctorForm((d) => ({ ...d, email: e.target.value }))}
                />
              </label>
              <label>
                Şifrə
                <input
                  type="password"
                  value={doctorForm.password}
                  onChange={(e) => setDoctorForm((d) => ({ ...d, password: e.target.value }))}
                />
              </label>
              <label>
                Unvan
                <input
                  value={doctorForm.title}
                  onChange={(e) => setDoctorForm((d) => ({ ...d, title: e.target.value }))}
                />
              </label>
              <label>
                Ad
                <input
                  value={doctorForm.firstName}
                  onChange={(e) => setDoctorForm((d) => ({ ...d, firstName: e.target.value }))}
                />
              </label>
              <label>
                Soyad
                <input
                  value={doctorForm.lastName}
                  onChange={(e) => setDoctorForm((d) => ({ ...d, lastName: e.target.value }))}
                />
              </label>
              <label>
                Şöbə
                <input
                  value={doctorForm.branch}
                  onChange={(e) => setDoctorForm((d) => ({ ...d, branch: e.target.value }))}
                />
              </label>
              <label>
                Otaq
                <input
                  value={doctorForm.roomNumber}
                  onChange={(e) => setDoctorForm((d) => ({ ...d, roomNumber: e.target.value }))}
                />
              </label>
            </div>

            <button type="button" onClick={() => void createDoctor()}>
              Həkim əlavə et
            </button>

            <div className="doctor-list">
              {doctors.map((doctor) => (
                <div key={doctor.id} className="doctor-row">
                  <div>
                    <strong>{doctor.fullName}</strong>
                    <p>
                      {doctor.branch} • Otaq: {doctor.roomNumber || "Yoxdur"}
                    </p>
                  </div>
                  <div className="doctor-actions">
                    <span data-active={doctor.active}>{doctor.active ? "Aktiv" : "Deaktiv"}</span>
                    {!doctor.active && (
                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => void deleteDoctor(doctor.id)}
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="content-grid lower-grid">
          <article className="panel-card" id="appointments">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Randevu formu</span>
                <h2>Yeni randevu yarat</h2>
              </div>
            </div>

            <div className="form-grid">
              <label>
                Pasiyent
                <select
                  value={appointmentForm.patientId}
                  onChange={(e) => setAppointmentForm((a) => ({ ...a, patientId: e.target.value }))}
                >
                  <option value="">Seçin</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.fullName} ({patient.identityNumber})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Həkim
                <select
                  value={appointmentForm.doctorId}
                  onChange={(e) => setAppointmentForm((a) => ({ ...a, doctorId: e.target.value }))}
                >
                  <option value="">Seçin</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.fullName} ({doctor.branch})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Başlama
                <input
                  type="datetime-local"
                  value={appointmentForm.startsAt}
                  onChange={(e) => setAppointmentForm((a) => ({ ...a, startsAt: e.target.value }))}
                />
              </label>

              <label>
                Bitmə
                <input
                  type="datetime-local"
                  value={appointmentForm.endsAt}
                  onChange={(e) => setAppointmentForm((a) => ({ ...a, endsAt: e.target.value }))}
                />
              </label>

              <label>
                Kanal
                <select
                  value={appointmentForm.channel}
                  onChange={(e) => setAppointmentForm((a) => ({ ...a, channel: e.target.value }))}
                >
                  <option value="web">Veb</option>
                  <option value="mobile">Mobil</option>
                  <option value="call-center">Çağrı mərkəzi</option>
                </select>
              </label>

              <label>
                Qeyd
                <input
                  value={appointmentForm.notes}
                  onChange={(e) => setAppointmentForm((a) => ({ ...a, notes: e.target.value }))}
                />
              </label>
            </div>

            <button type="button" onClick={() => void createAppointment()}>
              Randevu əlavə et
            </button>

            <div className="appointment-list">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="appointment-row">
                  <div>
                    <strong>{appointment.doctorName}</strong>
                    <p>
                      {appointment.branch} • {formatDate(appointment.startsAt)}
                    </p>
                  </div>
                  <div className="appointment-meta">
                    <span>{channelLabel(appointment.channel, t)}</span>
                    <span data-status={appointment.status}>{statusLabel(appointment.status, t)}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel-card" id="nurses">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Hemşire idarəsi</span>
                <h2>Hemşire siyahısı</h2>
              </div>
            </div>

            <div className="nurse-list">
              {nurses.map((nurse) => (
                <div key={nurse.id} className="nurse-row">
                  <div>
                    <strong>{nurse.email}</strong>
                    <p>Yaradılıb: {formatDate(nurse.createdAt)}</p>
                  </div>
                  <div className="nurse-actions">
                    <span data-active={nurse.active}>{nurse.active ? "Aktiv" : "Deaktiv"}</span>
                    {!nurse.active && (
                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => void deleteNurse(nurse.id)}
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel-card" id="reports">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Admin istifadəçilər</span>
                <h2>Rol əsaslı idarəetmə</h2>
              </div>
            </div>

            <button type="button" onClick={() => void createAdminUser()}>
              Çağrı mərkəzi istifadəçisi yarat
            </button>

            <div className="report-list">
              {adminUsers.map((item) => (
                <div key={item.id} className="report-item">
                  <strong>
                    {item.email} ({item.role})
                  </strong>
                  <p>Yaradılıb: {formatDate(item.createdAt)}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
