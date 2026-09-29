import {
    ArrowRight,
    ArrowUpRight,
    BookOpen,
    Check,
    CheckCircle2,
    CloudOff,
    ExternalLink,
    FileText,
    FolderOpen,
    Globe2,
    GraduationCap,
    Info,
    LayoutDashboard,
    Lightbulb,
    LogOut,
    Mic,
    PanelsTopLeft,
    Pencil,
    Plus,
    School,
    Search,
    Send,
    Settings2,
    ShieldCheck,
    Trash2,
    UserRoundPlus,
    Users,
    X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useRef, useState } from "react";

const STORE = {
    projects: "portfolihub-preview-projects-v1",
    faculty: "portfolihub-preview-faculty-v1",
    session: "portfolihub-preview-session",
};
const DEMO_ACCOUNTS = [
    { email: "admin@portfolihub.demo", name: "Showcase Admin", role: "admin", status: "approved" },
    { email: "faculty@portfolihub.demo", name: "Faculty Preview", role: "faculty", status: "approved" },
];

function readStore(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

function readSession() {
    try {
        return JSON.parse(sessionStorage.getItem(STORE.session) || "null");
    } catch {
        return null;
    }
}

function repositoryUrl(value) {
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}

function projectVideo(value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        return null;
    }
    if (url.protocol !== "https:") return null;

    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const segments = url.pathname.split("/").filter(Boolean);
    if (["youtube.com", "m.youtube.com", "youtube-nocookie.com", "youtu.be"].includes(host)) {
        const pathId = url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})(?:\/|$)/)?.[1];
        const id = host === "youtu.be" ? segments[0] : url.searchParams.get("v") || pathId;
        if (!id || !/^[\w-]{11}$/.test(id)) return null;
        return { url: url.href, type: "embed", src: `https://www.youtube-nocookie.com/embed/${id}` };
    }

    if (host === "vimeo.com" || host === "player.vimeo.com") {
        const videoIndex = segments.indexOf("video");
        const id = videoIndex >= 0 ? segments[videoIndex + 1] : segments[0];
        if (!id || !/^\d+$/.test(id)) return null;
        const secret = url.searchParams.get("h") || (videoIndex >= 0 ? segments[videoIndex + 2] : segments[1]);
        const query = secret && /^[\w-]+$/.test(secret) ? `?h=${encodeURIComponent(secret)}` : "";
        return { url: url.href, type: "embed", src: `https://player.vimeo.com/video/${id}${query}` };
    }

    const types = { mp4: "video/mp4", webm: "video/webm", ogg: "video/ogg" };
    const extension = url.pathname.split(".").pop()?.toLowerCase();
    const githubAttachment =
        host === "github.com" && segments[0] === "user-attachments" && segments[1] === "assets" && segments[2];
    if (types[extension] || githubAttachment)
        return { url: url.href, type: "file", src: url.href, mimeType: types[extension] };
    return null;
}

function MaterialButton({ variant = "filled", icon: Icon, className = "", children, ...props }) {
    const tag =
        variant === "tonal" ? "md-filled-tonal-button" : variant === "text" ? "md-text-button" : "md-filled-button";
    const classNames = `m3-button m3-${variant} ${className}`.trim();
    return React.createElement(
        tag,
        { className: classNames, type: "button", ...props },
        Icon ? <Icon slot="icon" size={18} strokeWidth={2} aria-hidden="true" /> : null,
        children,
    );
}

function MaterialIconButton({ icon: Icon, label, className = "", ...props }) {
    return (
        <md-icon-button className={`m3-icon-button ${className}`} aria-label={label} {...props}>
            <Icon slot="icon" size={20} strokeWidth={2} aria-hidden="true" />
        </md-icon-button>
    );
}

function PageHeader({ title, subtitle, session }) {
    return (
        <>
            <header className="page-header">
                <div>
                    <p className="overline">PHINMA SAINT JUDE COLLEGE · BSIT</p>
                    <h1>{title}</h1>
                    {subtitle && <p className="page-subtitle">{subtitle}</p>}
                </div>
                <div className="header-actions">
                    <span className="firebase-status">
                        <CloudOff size={17} /> Firebase setup postponed
                    </span>
                    {session && (
                        <span className="account-chip">
                            {session.role === "admin" ? <ShieldCheck size={18} /> : <School size={18} />}
                            <span>{session.name}</span>
                        </span>
                    )}
                </div>
            </header>
            <div className="preview-notice">
                <Info size={18} />
                <span>
                    Preview mode. Sign-in and records are simulated in this browser; Firebase Authentication and
                    Firestore are not connected.
                </span>
            </div>
        </>
    );
}

function NavRail({ session, view, authRole, navigate, signOut }) {
    const publicItems = [
        ["showcase", "Showcase", PanelsTopLeft],
        ["faculty-login", "Faculty", School],
        ["admin-login", "Admin", ShieldCheck],
    ];
    const roleItems = session
        ? [
              ["overview", "Overview", LayoutDashboard],
              ["upload", "Upload", Plus],
              ...(session.role === "admin"
                  ? [
                        ["manage-projects", "Capstones", FolderOpen],
                        ["faculty", "Faculty", Users],
                    ]
                  : [["my-projects", "Students Work", BookOpen]]),
              ["showcase", "Public", Globe2],
          ]
        : publicItems;
    return (
        <aside className="nav-rail" aria-label="Main navigation">
            <a
                className="rail-brand"
                href="#showcase"
                aria-label="PortfoliHub showcase"
                onClick={event => {
                    event.preventDefault();
                    navigate("showcase");
                }}
            >
                <span className="brand-mark">p</span>
                <span className="brand-name">PortfoliHub</span>
            </a>
            <nav className="rail-links" aria-label="Workspace">
                {roleItems.map(([destination, label, Icon]) => {
                    const active = view === destination || (view === "login" && destination === `${authRole}-login`);
                    return (
                        <a
                            key={destination}
                            className={`rail-link ${active ? "is-active" : ""}`}
                            href={`#${destination}`}
                            aria-label={label}
                            aria-current={active ? "page" : undefined}
                            onClick={event => {
                                event.preventDefault();
                                navigate(destination);
                            }}
                        >
                            <span className="rail-link-icon">
                                <Icon className="rail-icon" size={22} />
                            </span>
                            <span>{label}</span>
                        </a>
                    );
                })}
            </nav>
            <div className={`rail-bottom ${session ? "has-signout" : ""}`}>
                <span className="rail-school">SJC</span>
                {session ? (
                    <>
                        <span className="rail-role">{session.role === "admin" ? "ADMIN" : "FACULTY"}</span>
                        <button
                            type="button"
                            className="rail-link rail-signout"
                            aria-label="Sign out"
                            onClick={signOut}
                        >
                            <span className="rail-link-icon">
                                <LogOut className="rail-icon" size={22} aria-hidden="true" />
                            </span>
                            <span>Sign out</span>
                        </button>
                    </>
                ) : (
                    <span className="rail-role">PREVIEW</span>
                )}
            </div>
        </aside>
    );
}

function SearchBar({ value, onChange, placeholder, label, onVoiceSearch }) {
    return (
        <div className="search-bar" role="search">
            <Search className="search-leading" size={21} aria-hidden="true" />
            <input
                id="project-search"
                type="search"
                value={value}
                onChange={event => onChange(event.target.value)}
                placeholder={placeholder}
                aria-label={label}
            />
            {value ? (
                <MaterialIconButton
                    icon={X}
                    className="search-clear"
                    label="Clear search"
                    onClick={() => onChange("")}
                />
            ) : (
                <MaterialIconButton icon={Mic} className="search-voice" label="Voice search" onClick={onVoiceSearch} />
            )}
        </div>
    );
}

function ShowcaseFooter() {
    return (
        <footer className="showcase-footer">
            <div className="footer-wave" aria-hidden="true" />
            <div className="showcase-footer-content">
                <a className="footer-brand" href="#showcase">
                    <span className="brand-mark">p</span>
                    <strong>PortfoliHub</strong>
                </a>
                <p>PHINMA Saint Jude College · BSIT Capstone Showcase</p>
                <a className="footer-top-link" href="#showcase">
                    Back to showcase <ArrowUpRight size={16} />
                </a>
            </div>
        </footer>
    );
}

function ProjectCard({ project, canManage, index = 0, onEdit, onDelete }) {
    const repo = repositoryUrl(project.repositoryUrl);
    const video = project.demoVideoUrl ? projectVideo(project.demoVideoUrl) : null;
    return (
        <motion.article
            className="project-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.24 }}
        >
            <div className="project-card-top">
                <span className="published-tag">
                    <CheckCircle2 size={16} /> Published
                </span>
                <span className="project-date">{project.createdLabel || "Recently added"}</span>
            </div>
            <h3>{project.title}</h3>
            <p className="project-description">{project.description}</p>
            {video && (
                <div className="project-demo">
                    {video.type === "file" ? (
                        <video controls playsInline preload="metadata" aria-label={`${project.title} demo video`}>
                            <source src={video.src} type={video.mimeType} />
                        </video>
                    ) : (
                        <iframe
                            src={video.src}
                            title={`${project.title} demo video`}
                            loading="lazy"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    )}
                </div>
            )}
            <div className="project-card-footer">
                <span className="project-owner">
                    <School size={16} /> {project.facultyName || "Faculty"}
                </span>
                {repo && (
                    <MaterialButton variant="text" icon={ExternalLink} href={repo} target="_blank" rel="noreferrer">
                        Repository
                    </MaterialButton>
                )}
            </div>
            {canManage && (
                <div className="project-admin-actions">
                    <MaterialButton
                        variant="tonal"
                        className="m3-compact"
                        icon={Pencil}
                        onClick={() => onEdit(project)}
                    >
                        Edit
                    </MaterialButton>
                    <MaterialButton
                        variant="tonal"
                        className="m3-compact m3-delete"
                        icon={Trash2}
                        onClick={() => onDelete(project)}
                    >
                        Delete
                    </MaterialButton>
                </div>
            )}
        </motion.article>
    );
}

function ProjectGrid({ projects, query = "", session, canManage = false, onFacultyLogin, onEdit, onDelete }) {
    const needle = query.trim().toLowerCase();
    const results = projects.filter(
        item => !needle || `${item.title} ${item.description} ${item.facultyName || ""}`.toLowerCase().includes(needle),
    );
    if (!results.length)
        return (
            <div className="empty-state">
                <FolderOpen className="empty-icon" size={28} />
                <h2>{query ? "No matching capstones" : "No capstones published yet"}</h2>
                <p>
                    {query
                        ? "Try another title or keyword."
                        : "Approved faculty can publish student team projects directly to this showcase."}
                </p>
                {!query && !session && (
                    <MaterialButton icon={ArrowRight} onClick={onFacultyLogin}>
                        Faculty sign in
                    </MaterialButton>
                )}
            </div>
        );
    return (
        <div className="project-grid">
            {results.map((project, index) => (
                <ProjectCard
                    key={project.id}
                    project={project}
                    index={index}
                    canManage={canManage}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}

function ShowcaseView({ session, projects, query, setQuery, navigate, onVoiceSearch }) {
    return (
        <>
            <PageHeader
                title="Capstone showcase"
                subtitle="Student projects from the BSIT community."
                session={session}
            />
            <section className="platform-intro" aria-labelledby="platform-intro-title">
                <div className="platform-intro-copy">
                    <p className="overline">ABOUT PORTFOLIHUB</p>
                    <h2 id="platform-intro-title">A public home for PHINMA SJC capstones.</h2>
                    <p>
                        PortfoliHub gives student teams one place to share what they built and helps the community
                        discover the work coming out of the BSIT program.
                    </p>
                </div>
                <div className="platform-intro-mark">
                    <School size={22} />
                    <span>
                        PHINMA SJC
                        <br />
                        BSIT showcase
                    </span>
                </div>
            </section>
            <section className="showcase-section">
                <div className="section-toolbar">
                    <div>
                        <p className="overline">PUBLIC DIRECTORY</p>
                        <h2>
                            Browse capstones <span className="count-badge">{projects.length}</span>
                        </h2>
                    </div>
                    <SearchBar
                        value={query}
                        onChange={setQuery}
                        placeholder="Search projects"
                        label="Search capstone projects"
                        onVoiceSearch={onVoiceSearch}
                    />
                </div>
                <ProjectGrid
                    projects={projects}
                    query={query}
                    session={session}
                    onFacultyLogin={() => navigate("faculty-login")}
                />
            </section>
            <ShowcaseFooter />
        </>
    );
}

function StatCard({ label, value, Icon, detail }) {
    return (
        <article className="stat-card">
            <span className="stat-icon">
                <Icon size={19} />
            </span>
            <span className="stat-label">{label}</span>
            <strong>{value}</strong>
            <span className="stat-detail">{detail}</span>
        </article>
    );
}

function OverviewView({ session, projects, facultyAccounts, navigate }) {
    const admin = session.role === "admin";
    const owned = admin ? projects : projects.filter(project => project.facultyEmail === session.email);
    const pending = facultyAccounts.filter(account => account.status === "pending");
    return (
        <>
            <PageHeader
                title={admin ? "Workspace overview" : "Faculty workspace"}
                subtitle={
                    admin
                        ? "Manage the showcase and faculty access."
                        : "Publish student capstones to the public directory."
                }
                session={session}
            />
            <section className="stats-grid">
                <StatCard
                    label="Published capstones"
                    value={projects.length}
                    Icon={FolderOpen}
                    detail="Visible on the public showcase"
                />
                <StatCard
                    label={admin ? "Pending faculty" : "Your capstones"}
                    value={admin ? pending.length : owned.length}
                    Icon={admin ? UserRoundPlus : BookOpen}
                    detail={admin ? "Access requests awaiting review" : "Published from your account"}
                />
                <StatCard
                    label="Faculty accounts"
                    value={DEMO_ACCOUNTS.filter(item => item.role === "faculty").length + facultyAccounts.length}
                    Icon={Users}
                    detail={admin ? "Approved and pending" : "Showcase contributors"}
                />
            </section>
            <section className="dashboard-columns">
                <article className="surface-panel">
                    <div className="panel-heading">
                        <div>
                            <p className="overline">{admin ? "CONTENT" : "YOUR CONTENT"}</p>
                            <h2>{admin ? "Recently published" : "Your latest capstones"}</h2>
                        </div>
                        <MaterialButton
                            variant="tonal"
                            icon={ArrowRight}
                            className="m3-compact"
                            onClick={() => navigate(admin ? "manage-projects" : "my-projects")}
                        >
                            View all
                        </MaterialButton>
                    </div>
                    {owned.length ? (
                        <div className="compact-list">
                            {owned.slice(0, 3).map(item => (
                                <div className="compact-project" key={item.id}>
                                    <span className="compact-project-icon">
                                        <FileText size={18} />
                                    </span>
                                    <span>
                                        <strong>{item.title}</strong>
                                        <small>{item.facultyName} · Published</small>
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="inline-empty">No capstones here yet.</p>
                    )}
                </article>
                <article className="surface-panel action-panel">
                    <span className="action-icon">{admin ? <Settings2 size={20} /> : <Plus size={22} />}</span>
                    <p className="overline">{admin ? "FACULTY ACCESS" : "SHARE STUDENT WORK"}</p>
                    <h2>{admin ? `${pending.length} requests to review` : "Ready to publish?"}</h2>
                    <p>
                        {admin
                            ? "Approve faculty accounts before they can publish."
                            : "A submitted capstone appears on the public showcase immediately."}
                    </p>
                    <MaterialButton icon={ArrowRight} onClick={() => navigate(admin ? "faculty" : "upload")}>
                        {admin ? "Review faculty" : "Upload a capstone"}
                    </MaterialButton>
                </article>
            </section>
        </>
    );
}

function UploadView({ session, publish }) {
    const formRef = useRef(null);
    function submit(event) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        publish({
            title: String(data.get("title")).trim(),
            description: String(data.get("description")).trim(),
            repositoryUrl: String(data.get("repositoryUrl")).trim(),
            demoVideoUrl: String(data.get("demoVideoUrl")).trim(),
        });
    }
    return (
        <>
            <PageHeader
                title="Upload a capstone"
                subtitle="Complete the required details. Submission publishes the project immediately."
                session={session}
            />
            <section className="form-layout">
                <form id="upload-form" className="surface-panel project-form" ref={formRef} onSubmit={submit}>
                    <div className="form-heading">
                        <span className="step-pill">NEW PROJECT</span>
                        <h2>Project details</h2>
                        <p>Publicly visible as soon as you submit.</p>
                    </div>
                    <label className="form-field">
                        <span>
                            Title <b>Required</b>
                        </span>
                        <input name="title" required maxLength="120" placeholder="e.g. Campus Resource Finder" />
                    </label>
                    <label className="form-field">
                        <span>
                            Capstone description / about <b>Required</b>
                        </span>
                        <textarea
                            name="description"
                            rows="6"
                            required
                            maxLength="1600"
                            placeholder="Describe the problem, the solution, and what the student team built."
                        />
                        <small>Keep the summary clear for students, faculty, and recruiters.</small>
                    </label>
                    <label className="form-field">
                        <span>
                            Group repository URL <b>Required</b>
                        </span>
                        <input name="repositoryUrl" type="url" required placeholder="https://github.com/team/project" />
                        <small>Use the group's public GitHub repository or another public code host.</small>
                    </label>
                    <label className="form-field">
                        <span>Demo video URL</span>
                        <input name="demoVideoUrl" type="url" placeholder="https://youtu.be/..." />
                        <small>Optional. YouTube, Vimeo, or direct MP4, WebM, and Ogg videos are supported.</small>
                    </label>
                    <div className="publish-note">
                        <Globe2 size={19} />
                        <span>
                            <strong>Automatic publishing</strong>
                            <br />
                            This capstone will be visible on the public showcase after submission.
                        </span>
                    </div>
                    <div className="form-actions">
                        <MaterialButton icon={ArrowRight} type="submit">
                            Publish capstone
                        </MaterialButton>
                        <MaterialButton variant="tonal" onClick={() => formRef.current?.reset()}>
                            Clear fields
                        </MaterialButton>
                    </div>
                </form>
                <aside className="form-aside">
                    <div className="aside-icon">
                        <Lightbulb size={19} />
                    </div>
                    <h2>Before you publish</h2>
                    <p>
                        Confirm the repository is intended for public access and that the project details contain no
                        private student information.
                    </p>
                    <div className="aside-divider" />
                    <p className="aside-caption">Publishing is immediate. Admins can edit or remove any capstone.</p>
                </aside>
            </section>
        </>
    );
}

function ManageProjectsView({ session, projects, query, setQuery, openDialog, onVoiceSearch }) {
    return (
        <>
            <PageHeader
                title="Manage capstones"
                subtitle="Edit or delete any project in the public showcase."
                session={session}
            />
            <div className="section-toolbar management-toolbar">
                <div>
                    <p className="overline">ALL CONTENT</p>
                    <h2>
                        Published projects <span className="count-badge">{projects.length}</span>
                    </h2>
                </div>
                <SearchBar
                    value={query}
                    onChange={setQuery}
                    placeholder="Search capstones"
                    label="Search capstones"
                    onVoiceSearch={onVoiceSearch}
                />
            </div>
            <ProjectGrid
                projects={projects}
                query={query}
                canManage
                onEdit={project => openDialog("edit", project)}
                onDelete={project => openDialog("delete", project)}
                session={session}
            />
        </>
    );
}

function MyProjectsView({ session, projects }) {
    const mine = projects.filter(project => project.facultyEmail === session.email);
    return (
        <>
            <PageHeader
                title="My capstones"
                subtitle="Projects published from your faculty account."
                session={session}
            />
            <ProjectGrid projects={mine} session={session} />
        </>
    );
}

function FacultyAccountsView({ session, facultyAccounts, approve }) {
    const pending = facultyAccounts.filter(account => account.status === "pending");
    const active = facultyAccounts.filter(account => account.status === "approved");
    const AccountRow = ({ account, isPending }) => (
        <article className="account-row">
            <span className="account-avatar">{(account.name || "F").slice(0, 1).toUpperCase()}</span>
            <div className="account-details">
                <strong>{account.name}</strong>
                <span>{account.email}</span>
            </div>
            <span className={`status-pill ${isPending ? "status-pending" : "status-approved"}`}>
                {isPending ? "Pending" : "Approved"}
            </span>
            {isPending && (
                <MaterialButton icon={Check} className="m3-compact" onClick={() => approve(account.id)}>
                    Approve
                </MaterialButton>
            )}
        </article>
    );
    return (
        <>
            <PageHeader
                title="Faculty accounts"
                subtitle="Only admins can approve faculty access requests."
                session={session}
            />
            <div className="account-groups">
                <section className="surface-panel">
                    <div className="panel-heading">
                        <div>
                            <p className="overline">REVIEW REQUIRED</p>
                            <h2>
                                Pending requests <span className="count-badge">{pending.length}</span>
                            </h2>
                        </div>
                    </div>
                    {pending.length ? (
                        <div className="account-list">
                            {pending.map(account => (
                                <AccountRow key={account.id} account={account} isPending />
                            ))}
                        </div>
                    ) : (
                        <p className="inline-empty">No faculty requests need review.</p>
                    )}
                </section>
                <section className="surface-panel">
                    <div className="panel-heading">
                        <div>
                            <p className="overline">ACTIVE ACCESS</p>
                            <h2>
                                Approved faculty <span className="count-badge">{active.length}</span>
                            </h2>
                        </div>
                    </div>
                    {active.length ? (
                        <div className="account-list">
                            {active.map(account => (
                                <AccountRow key={account.id} account={account} isPending={false} />
                            ))}
                        </div>
                    ) : (
                        <p className="inline-empty">No approved faculty accounts.</p>
                    )}
                </section>
            </div>
        </>
    );
}

function LoginView({ role, setRole, login, requestAccess, requestOpen, setRequestOpen, session }) {
    const [email, setEmail] = useState("");
    const requestRef = useRef(null);
    const loginRef = useRef(null);
    const demoEmail = role === "admin" ? DEMO_ACCOUNTS[0].email : DEMO_ACCOUNTS[1].email;
    function submitLogin(event) {
        event.preventDefault();
        login(role, email.trim().toLowerCase());
    }
    function submitRequest(event) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        requestAccess({ name: String(data.get("name")).trim(), email: String(data.get("email")).trim().toLowerCase() });
        setRequestOpen(false);
    }
    return (
        <>
            <PageHeader
                title={role === "admin" ? "Admin sign in" : "Faculty sign in"}
                subtitle="Choose your role to continue to the showcase workspace."
                session={session}
            />
            <section className="auth-layout">
                <div className="auth-panel surface-panel">
                    <div className="role-switch" role="tablist" aria-label="Sign-in role">
                        <MaterialButton
                            variant={role === "faculty" ? "tonal" : "text"}
                            icon={School}
                            role="tab"
                            aria-selected={role === "faculty"}
                            onClick={() => setRole("faculty")}
                        >
                            Faculty
                        </MaterialButton>
                        <MaterialButton
                            variant={role === "admin" ? "tonal" : "text"}
                            icon={ShieldCheck}
                            role="tab"
                            aria-selected={role === "admin"}
                            onClick={() => setRole("admin")}
                        >
                            Admin
                        </MaterialButton>
                    </div>
                    <form id="login-form" ref={loginRef} onSubmit={submitLogin}>
                        <label className="form-field">
                            <span>
                                Institutional email <b>Required</b>
                            </span>
                            <input
                                type="email"
                                value={email}
                                onChange={event => setEmail(event.target.value)}
                                required
                                autoComplete="username"
                                placeholder="name@phinma.edu.ph"
                            />
                        </label>
                        <MaterialButton className="auth-submit" icon={ArrowRight} type="submit">
                            Continue as {role}
                        </MaterialButton>
                        <MaterialButton variant="text" className="demo-fill" onClick={() => setEmail(demoEmail)}>
                            Use preview account <span>{demoEmail}</span>
                        </MaterialButton>
                    </form>
                    {role === "faculty" && (
                        <div className="request-access">
                            <div>
                                <strong>Need faculty access?</strong>
                                <p>Submit an account request for an admin to review.</p>
                            </div>
                            <MaterialButton
                                variant="tonal"
                                icon={ArrowRight}
                                className="m3-compact"
                                onClick={() => setRequestOpen(!requestOpen)}
                            >
                                Request access
                            </MaterialButton>
                            {requestOpen && (
                                <form
                                    id="request-form"
                                    className="request-form request-open"
                                    ref={requestRef}
                                    onSubmit={submitRequest}
                                >
                                    <label className="form-field">
                                        <span>
                                            Full name <b>Required</b>
                                        </span>
                                        <input name="name" required maxLength="100" placeholder="Faculty name" />
                                    </label>
                                    <label className="form-field">
                                        <span>
                                            Institutional email <b>Required</b>
                                        </span>
                                        <input name="email" type="email" required placeholder="name@phinma.edu.ph" />
                                    </label>
                                    <MaterialButton variant="tonal" icon={Send} type="submit">
                                        Send access request
                                    </MaterialButton>
                                </form>
                            )}
                        </div>
                    )}
                    <p className="auth-disclaimer">
                        <Info size={15} /> Preview access only. Firebase Authentication is not connected yet.
                    </p>
                </div>
                <aside className="auth-aside">
                    <span className="auth-emblem">
                        {role === "admin" ? <ShieldCheck size={28} /> : <GraduationCap size={28} />}
                    </span>
                    <p className="overline">PORTFOLIHUB WORKSPACE</p>
                    <h2>{role === "admin" ? "Care for the whole showcase." : "Put student work in view."}</h2>
                    <p>
                        {role === "admin"
                            ? "Manage published capstones and approve faculty access requests."
                            : "Publish capstone details directly to the public directory."}
                    </p>
                </aside>
            </section>
        </>
    );
}

function ProjectDialog({ dialog, close, save, remove }) {
    if (!dialog) return null;
    const edit = dialog.kind === "edit";
    function submit(event) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        save(dialog.project.id, {
            title: String(data.get("title")).trim(),
            description: String(data.get("description")).trim(),
            repositoryUrl: String(data.get("repositoryUrl")).trim(),
            demoVideoUrl: String(data.get("demoVideoUrl")).trim(),
        });
    }
    return (
        <motion.div
            className="react-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={close}
        >
            <motion.section
                className="react-modal-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-heading"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                onMouseDown={event => event.stopPropagation()}
            >
                <div className="dialog-heading">
                    <span className="step-pill">{edit ? "ADMIN EDIT" : "REMOVE CONTENT"}</span>
                    <MaterialIconButton icon={X} label="Close" onClick={close} />
                </div>
                {edit ? (
                    <>
                        <h2 id="modal-heading">Edit capstone</h2>
                        <form id="edit-project-form" onSubmit={submit}>
                            <label className="form-field">
                                <span>
                                    Title <b>Required</b>
                                </span>
                                <input name="title" required maxLength="120" defaultValue={dialog.project.title} />
                            </label>
                            <label className="form-field">
                                <span>
                                    Capstone description / about <b>Required</b>
                                </span>
                                <textarea
                                    name="description"
                                    rows="5"
                                    required
                                    maxLength="1600"
                                    defaultValue={dialog.project.description}
                                />
                            </label>
                            <label className="form-field">
                                <span>
                                    Group repository URL <b>Required</b>
                                </span>
                                <input
                                    name="repositoryUrl"
                                    type="url"
                                    required
                                    defaultValue={dialog.project.repositoryUrl}
                                />
                            </label>
                            <label className="form-field">
                                <span>Demo video URL</span>
                                <input
                                    name="demoVideoUrl"
                                    type="url"
                                    placeholder="https://youtu.be/..."
                                    defaultValue={dialog.project.demoVideoUrl || ""}
                                />
                                <small>
                                    Optional. YouTube, Vimeo, or direct MP4, WebM, and Ogg videos are supported.
                                </small>
                            </label>
                            <div className="dialog-actions">
                                <MaterialButton variant="tonal" onClick={close}>
                                    Cancel
                                </MaterialButton>
                                <MaterialButton icon={Check} type="submit">
                                    Save changes
                                </MaterialButton>
                            </div>
                        </form>
                    </>
                ) : (
                    <>
                        <h2 id="modal-heading">Delete this capstone?</h2>
                        <p className="dialog-copy">
                            <strong>{dialog.project.title}</strong> will be removed from the public showcase. This
                            action cannot be undone.
                        </p>
                        <div className="dialog-actions">
                            <MaterialButton variant="tonal" onClick={close}>
                                Cancel
                            </MaterialButton>
                            <MaterialButton
                                className="m3-danger"
                                icon={Trash2}
                                onClick={() => remove(dialog.project.id)}
                            >
                                Delete capstone
                            </MaterialButton>
                        </div>
                    </>
                )}
            </motion.section>
        </motion.div>
    );
}

function LinkRipples() {
    useEffect(() => {
        function createRipple(target, x, y) {
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
            const box = target.getBoundingClientRect();
            const size = Math.ceil(Math.hypot(box.width, box.height));
            const frame = document.createElement("span");
            const wave = document.createElement("span");
            frame.className = "ripple-frame";
            frame.setAttribute("aria-hidden", "true");
            Object.assign(frame.style, {
                left: `${box.left}px`,
                top: `${box.top}px`,
                width: `${box.width}px`,
                height: `${box.height}px`,
                borderRadius: getComputedStyle(target).borderRadius,
                color: getComputedStyle(target).color,
            });
            wave.className = "ripple-wave";
            Object.assign(wave.style, {
                width: `${size}px`,
                height: `${size}px`,
                left: `${x - box.left - size / 2}px`,
                top: `${y - box.top - size / 2}px`,
            });
            frame.append(wave);
            document.body.append(frame);
            wave.addEventListener("animationend", () => frame.remove(), { once: true });
        }
        function onPointer(event) {
            if (!event.isPrimary || event.button !== 0) return;
            const link = event.target.closest(".rail-link");
            const target =
                link?.querySelector(".rail-link-icon") ||
                event.target.closest(".rail-brand, .footer-top-link, .footer-brand");
            if (target) createRipple(target, event.clientX, event.clientY);
        }
        document.addEventListener("pointerdown", onPointer, true);
        return () => document.removeEventListener("pointerdown", onPointer, true);
    }, []);
    return null;
}

export default function App() {
    const [projects, setProjects] = useState(() => readStore(STORE.projects, []));
    const [facultyAccounts, setFacultyAccounts] = useState(() => readStore(STORE.faculty, []));
    const [session, setSession] = useState(readSession);
    const [view, setView] = useState(() => (readSession() ? "overview" : "showcase"));
    const [authRole, setAuthRole] = useState("faculty");
    const [query, setQuery] = useState("");
    const [requestOpen, setRequestOpen] = useState(false);
    const [dialog, setDialog] = useState(null);
    const [toast, setToast] = useState("");

    useEffect(() => {
        try {
            localStorage.setItem(STORE.projects, JSON.stringify(projects));
        } catch {
            setToast("Browser storage is unavailable; changes will not persist.");
        }
    }, [projects]);
    useEffect(() => {
        try {
            localStorage.setItem(STORE.faculty, JSON.stringify(facultyAccounts));
        } catch {
            setToast("Browser storage is unavailable; changes will not persist.");
        }
    }, [facultyAccounts]);
    useEffect(() => {
        try {
            session
                ? sessionStorage.setItem(STORE.session, JSON.stringify(session))
                : sessionStorage.removeItem(STORE.session);
        } catch {
            /* Preview session remains in memory. */
        }
    }, [session]);
    useEffect(() => {
        if (!toast) return undefined;
        const timer = window.setTimeout(() => setToast(""), 3200);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const accounts = [...DEMO_ACCOUNTS, ...facultyAccounts];
    const notify = message => setToast(message);
    function navigate(destination) {
        if (destination === "faculty-login" || destination === "admin-login") {
            setAuthRole(destination === "admin-login" ? "admin" : "faculty");
            setView("login");
        } else setView(session ? destination : "showcase");
        setQuery("");
    }
    function signOut() {
        setSession(null);
        setView("showcase");
        setQuery("");
    }
    function login(role, email) {
        const account = accounts.find(item => item.email === email && item.role === role);
        if (!account)
            return notify("No matching preview account. Use the preview account button or request faculty access.");
        if (account.status !== "approved") return notify("This faculty account is pending admin approval.");
        setSession({ role, email: account.email, name: account.name });
        setView("overview");
        setQuery("");
    }
    function requestAccess({ name, email }) {
        if (accounts.some(item => item.email === email)) {
            notify("An account with this email already exists.");
            return;
        }
        setFacultyAccounts(items => [
            {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                name,
                email,
                role: "faculty",
                status: "pending",
            },
            ...items,
        ]);
        notify("Faculty access request sent for admin approval.");
    }
    function publish(data) {
        const repo = repositoryUrl(data.repositoryUrl);
        if (!repo) return notify("Enter a valid HTTP or HTTPS repository URL.");
        const videoUrl = String(data.demoVideoUrl || "").trim();
        const video = videoUrl ? projectVideo(videoUrl) : null;
        if (videoUrl && !video)
            return notify("Enter a supported HTTPS YouTube, Vimeo, or direct MP4, WebM, or Ogg URL.");
        const project = {
            ...data,
            repositoryUrl: repo,
            demoVideoUrl: video?.url || "",
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            facultyEmail: session.email,
            facultyName: session.name,
            createdLabel: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
                new Date(),
            ),
        };
        setProjects(items => [project, ...items]);
        setQuery("");
        setView(session.role === "admin" ? "manage-projects" : "my-projects");
        notify("Capstone published to the public showcase.");
    }
    function saveProject(id, changes) {
        if (!repositoryUrl(changes.repositoryUrl)) return notify("Enter a valid HTTP or HTTPS repository URL.");
        const videoUrl = String(changes.demoVideoUrl || "").trim();
        const video = videoUrl ? projectVideo(videoUrl) : null;
        if (videoUrl && !video)
            return notify("Enter a supported HTTPS YouTube, Vimeo, or direct MP4, WebM, or Ogg URL.");
        setProjects(items =>
            items.map(project =>
                project.id === id ? { ...project, ...changes, demoVideoUrl: video?.url || "" } : project,
            ),
        );
        setDialog(null);
        notify("Capstone changes saved.");
    }
    function deleteProject(id) {
        setProjects(items => items.filter(project => project.id !== id));
        setDialog(null);
        notify("Capstone deleted from the showcase.");
    }
    function approveFaculty(id) {
        setFacultyAccounts(items =>
            items.map(account => (account.id === id ? { ...account, status: "approved" } : account)),
        );
        notify("Faculty account approved.");
    }

    let content;
    if (!session)
        content =
            view === "login" ? (
                <LoginView
                    role={authRole}
                    setRole={setAuthRole}
                    login={login}
                    requestAccess={requestAccess}
                    requestOpen={requestOpen}
                    setRequestOpen={setRequestOpen}
                    session={session}
                />
            ) : (
                <ShowcaseView
                    session={session}
                    projects={projects}
                    query={query}
                    setQuery={setQuery}
                    navigate={navigate}
                    onVoiceSearch={() => notify("Voice search is not available in this preview.")}
                />
            );
    else if (view === "faculty" && session.role === "admin")
        content = <FacultyAccountsView session={session} facultyAccounts={facultyAccounts} approve={approveFaculty} />;
    else if (view === "manage-projects" && session.role === "admin")
        content = (
            <ManageProjectsView
                session={session}
                projects={projects}
                query={query}
                setQuery={setQuery}
                openDialog={(kind, project) => setDialog({ kind, project })}
                onVoiceSearch={() => notify("Voice search is not available in this preview.")}
            />
        );
    else if (view === "upload") content = <UploadView session={session} publish={publish} />;
    else if (view === "my-projects" && session.role === "faculty")
        content = <MyProjectsView session={session} projects={projects} />;
    else if (view === "showcase")
        content = (
            <ShowcaseView
                session={session}
                projects={projects}
                query={query}
                setQuery={setQuery}
                navigate={navigate}
                onVoiceSearch={() => notify("Voice search is not available in this preview.")}
            />
        );
    else
        content = (
            <OverviewView session={session} projects={projects} facultyAccounts={facultyAccounts} navigate={navigate} />
        );

    const routeKey = `${session?.role || "public"}-${view}-${authRole}`;
    return (
        <div className="app-shell">
            <NavRail session={session} view={view} authRole={authRole} navigate={navigate} signOut={signOut} />
            <main className="app-main">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        className="app-content"
                        key={routeKey}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                    >
                        {content}
                    </motion.div>
                </AnimatePresence>
            </main>
            <AnimatePresence>
                {dialog && (
                    <ProjectDialog
                        key={`${dialog.kind}-${dialog.project.id}`}
                        dialog={dialog}
                        close={() => setDialog(null)}
                        save={saveProject}
                        remove={deleteProject}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {toast && (
                    <motion.div
                        className="toast-region toast-visible"
                        role="status"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                    >
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>
            <LinkRipples />
        </div>
    );
}
