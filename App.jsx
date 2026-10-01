import {
    ArrowLeft,
    ArrowUpRight,
    BookOpen,
    Bot,
    Check,
    CheckCircle2,
    ChevronDown,
    Cloud,
    ExternalLink,
    FileText,
    FolderOpen,
    Globe2,
    GraduationCap,
    Info,
    LayoutDashboard,
    Lightbulb,
    LogIn,
    LogOut,
    Mic,
    Moon,
    PanelsTopLeft,
    Pencil,
    Plus,
    RefreshCw,
    School,
    Search,
    Send,
    Settings2,
    ShieldCheck,
    Sun,
    Trash2,
    UserRoundPlus,
    Users,
    X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
    createUserWithEmailAndPassword,
    deleteUser,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
} from "firebase/auth";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore";
import { auth, db, firebaseReady } from "./firebase";

const OLLAMA_BASE_URL = String(import.meta.env.VITE_OLLAMA_BASE_URL || "").trim().replace(/\/+$/, "");
const PROJECT_CATEGORIES = ["Systems", "AI", "Applications", "Websites"];
const PROJECT_FILTERS = ["All", ...PROJECT_CATEGORIES];
function ollamaBaseUrl() {
    if (OLLAMA_BASE_URL) return OLLAMA_BASE_URL;
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${window.location.hostname}:11434`;
}
const ASSISTANT_SYSTEM_PROMPT = `You are the PortfoliHub assistant for the PHINMA Saint Jude College BSIT capstone showcase.
Answer concise questions about this application's workflow using only these facts:
- Firebase Authentication handles sign-in and faculty registration. Firestore stores user profiles and capstones.
- Faculty access requests require an address ending in .sjc@phinmaed.com.
- An admin reviews and approves faculty access requests in the Faculty accounts view.
- Approved faculty can publish a capstone by providing its title, capstone leader's name, category (Systems, AI, Applications, or Websites), description, public image URL, and repository URL. A demo video is optional.
- Publishing a capstone makes it public immediately. The app currently has no draft or pending-capstone approval state.
- Admins can edit or delete published capstones.
- Pending and approved refer to faculty access accounts, not student capstones.
If a question requires data not provided here, say what is unknown. Never invent project statuses.`;

function isFacultyEmail(value) {
    return /^[a-z0-9._%+-]+\.sjc@phinmaed\.com$/i.test(String(value || "").trim());
}

async function loadUserProfile(uid) {
    const adminSnapshot = await getDoc(doc(db, "admin", uid));
    if (adminSnapshot.exists()) return { uid, ...adminSnapshot.data(), role: "admin" };

    const facultySnapshot = await getDoc(doc(db, "faculty", uid));
    if (facultySnapshot.exists()) return { uid, ...facultySnapshot.data(), role: "faculty" };
    return null;
}

function readTheme() {
    try {
        return localStorage.getItem("portfolihub-theme") === "dark" ? "dark" : "light";
    } catch {
        return "light";
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

function projectImage(value) {
    if (!value) return null;
    const text = String(value).trim();
    if (!text) return null;
    if (text.startsWith("data:image/")) return { url: text };
    try {
        const url = new URL(text);
        if (["http:", "https:"].includes(url.protocol)) return { url: url.href };
    } catch {
        return null;
    }
    return null;
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
        Icon ? (
            Icon === ArrowForwardIcon ? (
                <Icon />
            ) : (
                <Icon slot="icon" size={18} strokeWidth={2} aria-hidden="true" />
            )
        ) : null,
        children,
    );
}

function ArrowForwardIcon() {
    return (
        <span slot="icon" className="material-symbols-rounded arrow-forward-icon" aria-hidden="true">
            arrow_forward
        </span>
    );
}

function MaterialIconButton({ icon: Icon, label, className = "", ...props }) {
    return (
        <md-icon-button className={`m3-icon-button ${className}`} aria-label={label} {...props}>
            <Icon slot="icon" size={20} strokeWidth={2} aria-hidden="true" />
        </md-icon-button>
    );
}

function ProjectCategoryMenu({ id, defaultValue = "" }) {
    const [category, setCategory] = useState(defaultValue);
    const menuRef = useRef(null);
    const menuId = `${id}-menu`;
    const labelId = `${id}-label`;

    return (
        <label className="form-field project-category-field">
            <span id={labelId}>
                Project category <b>Required</b>
            </span>
            <input type="hidden" name="category" value={category} readOnly />
            <button
                id={id}
                type="button"
                className="assistant-model-trigger"
                aria-labelledby={`${labelId} ${id}-value`}
                aria-haspopup="menu"
                aria-controls={menuId}
                onClick={() => menuRef.current?.show()}
            >
                <span id={`${id}-value`}>{category || "Select category"}</span>
                <ChevronDown size={16} aria-hidden="true" />
            </button>
            <md-menu
                id={menuId}
                class="assistant-model-menu"
                ref={menuRef}
                anchor={id}
                positioning="popover"
                anchor-corner="end-start"
                menu-corner="start-start"
            >
                {PROJECT_CATEGORIES.map(item => (
                    <md-menu-item
                        key={item}
                        type="button"
                        selected={item === category}
                        onClick={() => {
                            setCategory(item);
                            menuRef.current?.close();
                        }}
                    >
                        <span slot="start">{item === category && <Check size={17} aria-hidden="true" />}</span>
                        <span slot="headline">{item}</span>
                    </md-menu-item>
                ))}
            </md-menu>
        </label>
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
                        <Cloud size={17} /> {firebaseReady ? "Firebase configured" : "Firebase not configured"}
                    </span>
                    {session && (
                        <span className="account-chip">
                            {session.role === "admin" ? <ShieldCheck size={18} /> : <School size={18} />}
                            <span>{session.name}</span>
                        </span>
                    )}
                </div>
            </header>
        </>
    );
}

function NavRail({ session, view, navigate, signOut, theme, toggleTheme }) {
    const publicItems = [
        ["showcase", "Showcase", PanelsTopLeft],
        ["portal", "Portal", LogIn],
        ["assistant", "Ask Assistant", Bot],
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
                  : [["my-projects", "Student Capstone", BookOpen]]),
              ["showcase", "Public", Globe2],
              ["assistant", "Ask Assistant", Bot],
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
                <img className="brand-mark" src="/assets/logoapp.gif" alt="" />
                <span className="brand-name">PortfoliHub</span>
            </a>
            <nav className="rail-links" aria-label="Workspace">
                {roleItems.map(([destination, label, Icon]) => {
                    const active = view === destination || (view === "login" && destination === "portal");
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
                <button
                    type="button"
                    className="rail-link rail-theme-toggle"
                    aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                    title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                    onClick={toggleTheme}
                >
                    <span className="rail-link-icon">
                        {theme === "dark" ? (
                            <Sun className="rail-icon" size={22} />
                        ) : (
                            <Moon className="rail-icon" size={22} />
                        )}
                    </span>
                    <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                </button>
                {session ? (
                    <>
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
                ) : null}
            </div>
        </aside>
    );
}

function normalizeTitle(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function projectStatusAnswer(question, projects) {
    const asksStatus =
        /\bstatus\b|\bsubmission\b|\bsubmitted\b|\bprogress\b|\b(?:is|are|was|were|has|have|did|do)\b.{0,60}\b(?:published|pending|approved|submitted)\b/i.test(
            question,
        );
    if (!asksStatus) return null;

    const normalizedQuestion = normalizeTitle(question);
    const matches = projects.filter(project => normalizedQuestion.includes(normalizeTitle(project.title)));
    if (!matches.length) {
        return "I couldn't find a published capstone matching that title in the available showcase records. Capstones publish immediately when faculty submit them; unpublished student submissions aren't tracked. Pending or approved status applies to faculty access requests, not capstones.";
    }

    return matches
        .map(
            project =>
                `${project.title}: ${project.status || "Published"}${project.createdLabel ? ` on ${project.createdLabel}` : ""}.`,
        )
        .join("\n");
}

function AssistantView({ session, projects }) {
    const ollamaUrl = ollamaBaseUrl();
    const [models, setModels] = useState([]);
    const [model, setModel] = useState("");
    const [connection, setConnection] = useState("checking");
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content: "I can answer questions about the showcase workflow and check published capstone titles.",
        },
    ]);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [modelMenuOpen, setModelMenuOpen] = useState(false);
    const messagesRef = useRef(null);
    const modelMenuRef = useRef(null);

    async function loadModels() {
        setConnection("checking");
        try {
            const response = await fetch(`${ollamaUrl}/api/tags`);
            if (!response.ok) throw new Error(`Ollama returned ${response.status}.`);
            const data = await response.json();
            const availableModels = Array.isArray(data.models) ? data.models : [];
            setModels(availableModels);
            setModel(current =>
                availableModels.some(item => item.name === current) ? current : availableModels[0]?.name || "",
            );
            setConnection(availableModels.length ? "connected" : "no-models");
        } catch {
            setModels([]);
            setModel("");
            setConnection("offline");
        }
    }

    useEffect(() => {
        loadModels();
    }, []);
    useEffect(() => {
        const menu = modelMenuRef.current;
        if (!menu) return undefined;
        const onOpened = () => setModelMenuOpen(true);
        const onClosed = () => setModelMenuOpen(false);
        menu.addEventListener("opened", onOpened);
        menu.addEventListener("closed", onClosed);
        return () => {
            menu.removeEventListener("opened", onOpened);
            menu.removeEventListener("closed", onClosed);
        };
    }, []);
    useEffect(() => {
        messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, sending]);

    async function submit(event) {
        event.preventDefault();
        const question = draft.trim();
        if (!question || sending) return;

        const userMessage = { role: "user", content: question };
        setMessages(current => [...current, userMessage]);
        setDraft("");

        const statusAnswer = projectStatusAnswer(question, projects);
        if (statusAnswer) {
            setMessages(current => [...current, { role: "assistant", content: statusAnswer }]);
            return;
        }
        if (!model) {
            const message =
                connection === "no-models"
                    ? "Ollama is reachable, but no models are installed. Run `ollama pull llama3.2`, then retry the connection."
                    : `I can't reach Ollama at ${ollamaUrl}. Confirm the server is running and accepts connections from this device.`;
            setMessages(current => [...current, { role: "assistant", content: message }]);
            return;
        }

        setSending(true);
        try {
            const history = [...messages, userMessage].slice(-8).map(({ role, content }) => ({ role, content }));
            const response = await fetch(`${ollamaUrl}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model,
                    stream: false,
                    messages: [{ role: "system", content: ASSISTANT_SYSTEM_PROMPT }, ...history],
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `Ollama returned ${response.status}.`);
            const answer = data.message?.content?.trim();
            if (!answer) throw new Error("The selected model returned an empty response.");
            setMessages(current => [...current, { role: "assistant", content: answer }]);
        } catch (error) {
            setMessages(current => [
                ...current,
                { role: "assistant", content: `Ollama request failed: ${error.message}` },
            ]);
        } finally {
            setSending(false);
        }
    }

    const connectionLabel = {
        checking: "Checking Ollama",
        connected: "Ollama connected",
        "no-models": "No local models",
        offline: "Ollama unavailable",
    }[connection];

    return (
        <>
            <PageHeader
                title="Ask Assistant"
                subtitle="Get help with the showcase workflow or check a published capstone."
                session={session}
            />
            <section className="assistant-panel surface-panel" aria-label="Ask Assistant">
                <div className="assistant-toolbar">
                    <span className={`assistant-connection connection-${connection}`} role="status">
                        <span className="connection-dot" />
                        {connectionLabel}
                    </span>
                    <div className="assistant-model-controls">
                        <label htmlFor="assistant-model">Model</label>
                        <button
                            id="assistant-model"
                            type="button"
                            className="assistant-model-trigger"
                            aria-haspopup="menu"
                            aria-expanded={modelMenuOpen}
                            aria-controls="assistant-model-menu"
                            disabled={!models.length}
                            onClick={() => modelMenuRef.current?.show()}
                        >
                            <span>{model || "No model installed"}</span>
                            <ChevronDown size={16} aria-hidden="true" />
                        </button>
                        <md-menu
                            id="assistant-model-menu"
                            class="assistant-model-menu"
                            ref={modelMenuRef}
                            anchor="assistant-model"
                            positioning="popover"
                            anchor-corner="end-start"
                            menu-corner="start-start"
                        >
                            {models.map(item => (
                                <md-menu-item
                                    key={item.name}
                                    type="button"
                                    selected={item.name === model}
                                    onClick={() => {
                                        setModel(item.name);
                                        modelMenuRef.current?.close();
                                    }}
                                >
                                    <span slot="start">
                                        {item.name === model && <Check size={17} aria-hidden="true" />}
                                    </span>
                                    <span slot="headline">{item.name}</span>
                                </md-menu-item>
                            ))}
                        </md-menu>
                        <button
                            type="button"
                            className="assistant-retry"
                            onClick={loadModels}
                            aria-label="Retry Ollama connection"
                            title="Retry Ollama connection"
                        >
                            <RefreshCw size={17} />
                        </button>
                    </div>
                </div>
                <div className="assistant-messages" ref={messagesRef} aria-live="polite">
                    {messages.map((message, index) => (
                        <motion.article
                            className={`assistant-message message-${message.role}`}
                            key={`${index}-${message.role}`}
                            initial={{ opacity: 0, scale: 0.86 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            style={{ transformOrigin: message.role === "user" ? "right center" : "left center" }}
                        >
                            <span className="assistant-message-icon">
                                {message.role === "assistant" ? <Bot size={17} /> : <Users size={17} />}
                            </span>
                            <div>
                                <strong>{message.role === "assistant" ? "Assistant" : "You"}</strong>
                                <p>{message.content}</p>
                            </div>
                        </motion.article>
                    ))}
                    {sending && (
                        <div className="assistant-thinking" role="status">
                            <span className="connection-dot" /> Thinking with {model}...
                        </div>
                    )}
                </div>
                <form className="assistant-compose" onSubmit={submit}>
                    <label className="sr-only" htmlFor="assistant-question">
                        Ask a question
                    </label>
                    <input
                        id="assistant-question"
                        value={draft}
                        onChange={event => setDraft(event.target.value)}
                        placeholder="Ask about the workflow or a capstone title"
                        autoComplete="off"
                    />
                    <MaterialButton icon={Send} type="submit" disabled={!draft.trim() || sending}>
                        Ask
                    </MaterialButton>
                </form>
                {connection === "no-models" && (
                    <p className="assistant-setup-note">
                        Ollama is running. Install a model, then retry: <code>ollama pull llama3.2</code>
                    </p>
                )}
                {connection === "offline" && (
                    <p className="assistant-setup-note">
                        Ollama unavailable at <code>{ollamaUrl}</code>. On its host, bind Ollama to the network and allow
                        this app's origin <code>{window.location.origin}</code> in <code>OLLAMA_ORIGINS</code>.
                        Set <code>OLLAMA_HOST=0.0.0.0:11434</code> and restart Ollama.
                    </p>
                )}
            </section>
        </>
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
                <div className="footer-brand-block">
                    <a className="footer-brand" href="#showcase">
                        <img className="brand-mark" src="/assets/logoapp.gif" alt="" />
                        <strong>PortfoliHub</strong>
                    </a>
                    <p>PHINMA Saint Jude College · BSIT Capstone Showcase</p>
                    <a
                        className="footer-school-link"
                        href="https://sjc.phinma.edu.ph/"
                        target="_blank"
                        rel="noreferrer"
                    >
                        School website
                    </a>
                </div>
                <div className="footer-links">
                    <strong>Social</strong>
                    <a href="https://github.com/" target="_blank" rel="noreferrer">
                        GitHub
                    </a>
                    <a href="https://x.com/" target="_blank" rel="noreferrer">
                        X
                    </a>
                    <a href="https://www.youtube.com/" target="_blank" rel="noreferrer">
                        YouTube
                    </a>
                    <a href="https://sjc.phinma.edu.ph/feed/" target="_blank" rel="noreferrer">
                        Blog RSS
                    </a>
                </div>
                <a className="footer-top-link" href="#showcase">
                    Back to showcase <ArrowUpRight size={16} />
                </a>
            </div>
        </footer>
    );
}

function ProjectCard({ project, canManage, canRequestDelete, index = 0, onOpen, onEdit, onDelete, onRequestDelete }) {
    const image = project.imageUrl ? projectImage(project.imageUrl) : null;
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
            {image && (
                <img
                    className="project-image"
                    src={image.url}
                    alt={`${project.title} cover image`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                />
            )}
            <p className="project-description">{project.description}</p>
            <div className="project-card-footer">
                <span className="project-owner">
                    <School size={16} /> {project.leaderName || project.facultyName || "Capstone leader"}
                </span>
                <MaterialButton variant="text" icon={ArrowUpRight} onClick={() => onOpen(project)}>
                    Read capstone
                </MaterialButton>
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
            {canRequestDelete && (
                <div className="project-admin-actions">
                    <MaterialButton
                        variant="tonal"
                        className="m3-compact m3-delete"
                        icon={Trash2}
                        onClick={() => onRequestDelete(project)}
                    >
                        Request deletion
                    </MaterialButton>
                </div>
            )}
        </motion.article>
    );
}

function ProjectGrid({
    projects,
    query = "",
    category = "All",
    session,
    canManage = false,
    canRequestDelete = false,
    onFacultyLogin,
    onOpen,
    onEdit,
    onDelete,
    onRequestDelete,
    emptyTitle = "No capstones published yet",
    emptyMessage = "Approved faculty can publish student team projects directly to this showcase.",
}) {
    const needle = query.trim().toLowerCase();
    const results = projects.filter(item => {
        const matchesCategory = category === "All" || item.category === category;
        const searchable = `${item.title} ${item.description} ${item.leaderName || item.facultyName || ""} ${item.category || ""}`;
        return matchesCategory && (!needle || searchable.toLowerCase().includes(needle));
    });
    const hasFilters = Boolean(needle) || category !== "All";
    if (!results.length)
        return (
            <div className="empty-state">
                <FolderOpen className="empty-icon" size={28} />
                <h2>{hasFilters ? "No matching capstones" : emptyTitle}</h2>
                <p>{hasFilters ? "Try another search or category." : emptyMessage}</p>
                {!hasFilters && !session && (
                    <MaterialButton icon={ArrowForwardIcon} onClick={onFacultyLogin}>
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
                    canRequestDelete={canRequestDelete}
                    onOpen={onOpen}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onRequestDelete={onRequestDelete}
                />
            ))}
        </div>
    );
}

function ProjectArticleView({
    project,
    onBack,
    canManage,
    canRequestDelete,
    onEdit,
    onDelete,
    onRequestDelete,
}) {
    if (!project) {
        return (
            <section className="empty-state project-not-found">
                <FolderOpen className="empty-icon" size={28} />
                <h1>Capstone not found</h1>
                <p>This capstone may have been removed from the showcase.</p>
                <MaterialButton variant="tonal" icon={ArrowLeft} onClick={onBack}>
                    Back to projects
                </MaterialButton>
            </section>
        );
    }

    const repo = repositoryUrl(project.repositoryUrl);
    const image = project.imageUrl ? projectImage(project.imageUrl) : null;
    const video = project.demoVideoUrl ? projectVideo(project.demoVideoUrl) : null;

    return (
        <article className="project-article">
            <MaterialButton className="article-back-button" variant="tonal" icon={ArrowLeft} onClick={onBack}>
                Back to projects
            </MaterialButton>
            <header className="project-article-header">
                <p className="overline">PHINMA SJC · BSIT CAPSTONE</p>
                <h1>{project.title}</h1>
                <div className="project-article-byline">
                    <span>
                        <School size={17} /> {project.leaderName || project.facultyName || "Capstone leader"}
                    </span>
                    <span>
                        <CheckCircle2 size={16} /> Published {project.createdLabel || "recently"}
                    </span>
                </div>
            </header>

            {image && (
                <img
                    className="project-article-cover"
                    src={image.url}
                    alt={`${project.title} cover image`}
                    referrerPolicy="no-referrer"
                />
            )}

            <div className="project-article-layout">
                <section className="project-article-copy" aria-labelledby="project-article-about">
                    <p className="overline">ABOUT THE PROJECT</p>
                    <h2 id="project-article-about">Project overview</h2>
                    <p>{project.description}</p>
                </section>
                <aside className="project-article-aside" aria-label="Project resources and actions">
                    <p className="overline">PROJECT DETAILS</p>
                    <dl className="project-article-details">
                        <div>
                            <dt>Capstone leader</dt>
                            <dd>{project.leaderName || project.facultyName || "Capstone leader"}</dd>
                        </div>
                        <div>
                            <dt>Category</dt>
                            <dd>{project.category || "Uncategorized"}</dd>
                        </div>
                        <div>
                            <dt>Published</dt>
                            <dd>{project.createdLabel || "Recently added"}</dd>
                        </div>
                    </dl>
                    {repo && (
                        <MaterialButton
                            variant="tonal"
                            className="article-resource-button"
                            icon={ExternalLink}
                            href={repo}
                            target="_blank"
                            rel="noreferrer"
                        >
                            View repository
                        </MaterialButton>
                    )}
                    {canManage && (
                        <div className="project-article-actions">
                            <MaterialButton variant="tonal" icon={Pencil} onClick={() => onEdit(project)}>
                                Edit capstone
                            </MaterialButton>
                            <MaterialButton
                                variant="tonal"
                                className="m3-delete"
                                icon={Trash2}
                                onClick={() => onDelete(project)}
                            >
                                Delete capstone
                            </MaterialButton>
                        </div>
                    )}
                    {canRequestDelete && (
                        <div className="project-article-actions">
                            <MaterialButton
                                variant="tonal"
                                className="m3-delete"
                                icon={Trash2}
                                onClick={() => onRequestDelete(project)}
                            >
                                Request deletion
                            </MaterialButton>
                        </div>
                    )}
                </aside>
            </div>

            {video && (
                <section className="project-article-demo" aria-labelledby="project-article-demo-title">
                    <p className="overline">PROJECT DEMONSTRATION</p>
                    <h2 id="project-article-demo-title">See it in action</h2>
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
                </section>
            )}
        </article>
    );
}

function ShowcaseView({ session, projects, query, setQuery, navigate, onOpenProject, onVoiceSearch }) {
    const [category, setCategory] = useState("All");
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
                <div className="project-category-filters" role="group" aria-label="Filter capstones by category">
                    {PROJECT_FILTERS.map(item => (
                        <button
                            key={item}
                            type="button"
                            className={`project-category-filter${category === item ? " is-selected" : ""}`}
                            aria-pressed={category === item}
                            onClick={() => setCategory(item)}
                        >
                            {item}
                        </button>
                    ))}
                </div>
                <ProjectGrid
                    projects={projects}
                    query={query}
                    category={category}
                    session={session}
                    onOpen={onOpenProject}
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

function OverviewView({ session, projects, facultyAccounts, navigate, onOpenProject }) {
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
                    label={admin ? "Pending faculty" : "Student capstones"}
                    value={admin ? pending.length : owned.length}
                    Icon={admin ? UserRoundPlus : BookOpen}
                    detail={admin ? "Access requests awaiting review" : "Published student work"}
                />
                <StatCard
                    label="Faculty accounts"
                    value={facultyAccounts.length}
                    Icon={Users}
                    detail={admin ? "Approved and pending" : "Showcase contributors"}
                />
            </section>
            <section className="dashboard-columns">
                <article className="surface-panel">
                    <div className="panel-heading">
                        <div>
                            <p className="overline">{admin ? "CONTENT" : "STUDENT CAPSTONES"}</p>
                            <h2>{admin ? "Recently published" : "Latest student capstones"}</h2>
                        </div>
                        <MaterialButton
                            variant="tonal"
                            icon={ArrowForwardIcon}
                            className="m3-compact"
                            onClick={() => navigate(admin ? "manage-projects" : "my-projects")}
                        >
                            View all
                        </MaterialButton>
                    </div>
                    {owned.length ? (
                        <div className="compact-list">
                            {owned.slice(0, 3).map(item => (
                                <button
                                    className="compact-project"
                                    key={item.id}
                                    type="button"
                                    onClick={() => onOpenProject(item)}
                                >
                                    <span className="compact-project-icon">
                                        <FileText size={18} />
                                    </span>
                                    <span>
                                        <strong>{item.title}</strong>
                                        <small>{item.leaderName || item.facultyName || "Capstone leader"} · Published</small>
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="inline-empty">No student capstones here yet.</p>
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
                    <MaterialButton icon={ArrowForwardIcon} onClick={() => navigate(admin ? "faculty" : "upload")}>
                        {admin ? "Review faculty" : "Upload a capstone"}
                    </MaterialButton>
                </article>
            </section>
        </>
    );
}

function UploadView({ session, publish }) {
    const formRef = useRef(null);
    const [categoryMenuVersion, setCategoryMenuVersion] = useState(0);
    function submit(event) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        publish({
            title: String(data.get("title")).trim(),
            leaderName: String(data.get("leaderName")).trim(),
            category: String(data.get("category") || ""),
            description: String(data.get("description")).trim(),
            imageUrl: String(data.get("imageUrl") || "").trim(),
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
                            Capstone leader's name <b>Required</b>
                        </span>
                        <input name="leaderName" required maxLength="100" placeholder="Student team leader's name" />
                    </label>
                    <ProjectCategoryMenu key={categoryMenuVersion} id="upload-project-category" />
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
                            Project image URL <b>Required</b>
                        </span>
                        <input
                            name="imageUrl"
                            type="url"
                            required
                            placeholder="https://images.example.com/project-cover.jpg"
                        />
                        <small>
                            Paste a public image URL for the showcase cover. Accepts most direct image links.
                        </small>
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
                        <MaterialButton icon={ArrowForwardIcon} type="submit">
                            Publish capstone
                        </MaterialButton>
                        <MaterialButton
                            variant="tonal"
                            onClick={() => {
                                formRef.current?.reset();
                                setCategoryMenuVersion(version => version + 1);
                            }}
                        >
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

function ManageProjectsView({ session, projects, query, setQuery, openDialog, onOpenProject, onVoiceSearch }) {
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
                onOpen={onOpenProject}
                onEdit={project => openDialog("edit", project)}
                onDelete={project => openDialog("delete", project)}
                session={session}
            />
        </>
    );
}

function StudentCapstonesView({ session, projects, requestDeletion, requestAccountDeletion, onOpenProject }) {
    const ownProjects = projects.filter(
        project => project.facultyUid === session.uid || project.facultyEmail === session.email,
    );
    const otherFacultyProjects = projects.filter(project => project.facultyEmail !== session.email);
    return (
        <>
            <PageHeader
                title="Student Capstones"
                subtitle="Manage student projects on behalf of your students and browse other faculty projects."
                session={session}
            />
            <section className="showcase-section">
                <div className="section-toolbar">
                    <div>
                        <p className="overline">STUDENT PROJECTS</p>
                        <h2>Student capstones</h2>
                    </div>
                    <MaterialButton
                        variant="tonal"
                        className="m3-compact m3-delete"
                        icon={Trash2}
                        onClick={requestAccountDeletion}
                    >
                        Request account removal
                    </MaterialButton>
                </div>
                <ProjectGrid
                    projects={ownProjects}
                    session={session}
                    canRequestDelete
                    onOpen={onOpenProject}
                    onRequestDelete={requestDeletion}
                    emptyTitle="No student capstones published yet"
                    emptyMessage="Student projects you manage will appear here."
                />
            </section>
            <section className="showcase-section">
                <div className="section-toolbar">
                    <div>
                        <p className="overline">PUBLIC DIRECTORY</p>
                        <h2>Other faculty projects</h2>
                    </div>
                </div>
                <ProjectGrid
                    projects={otherFacultyProjects}
                    session={session}
                    onOpen={onOpenProject}
                    emptyTitle="No other capstones yet"
                    emptyMessage="Capstones published by other faculty will appear here."
                />
            </section>
        </>
    );
}

function FacultyAccountsView({
    session,
    facultyAccounts,
    projectDeletionRequests,
    accountDeletionRequests,
    approve,
    deny,
    removeRejected,
    resolveProjectDeletion,
    resolveAccountDeletion,
}) {
    const pending = facultyAccounts.filter(account => account.status === "pending");
    const active = facultyAccounts.filter(account => account.status === "approved");
    const rejected = facultyAccounts.filter(account => account.status === "rejected");
    const pendingProjectDeletions = projectDeletionRequests.filter(request => request.status === "pending");
    const resolvedProjectDeletions = projectDeletionRequests.filter(request => request.status !== "pending");
    const pendingAccountDeletions = accountDeletionRequests.filter(request => request.status === "pending");
    const resolvedAccountDeletions = accountDeletionRequests.filter(request => request.status !== "pending");
    const AccountRow = ({ account, status }) => (
        <article className="account-row">
            <span className="account-avatar">{(account.name || "F").slice(0, 1).toUpperCase()}</span>
            <div className="account-details">
                <strong>{account.name}</strong>
                <span>{account.email}</span>
            </div>
            <span className={`status-pill status-${status}`}>
                {status === "pending" ? "Pending" : status === "approved" ? "Approved" : "Denied"}
            </span>
            <div className="account-actions">
                {status === "pending" && (
                    <>
                        <MaterialButton icon={Check} className="m3-compact" onClick={() => approve(account.id)}>
                            Approve
                        </MaterialButton>
                        <MaterialButton
                            variant="tonal"
                            icon={X}
                            className="m3-compact m3-delete"
                            onClick={() => deny(account.id)}
                        >
                            Deny
                        </MaterialButton>
                    </>
                )}
                {status === "rejected" && (
                    <MaterialButton
                        variant="tonal"
                        icon={Trash2}
                        className="m3-compact m3-delete"
                        onClick={() => removeRejected(account)}
                    >
                        Delete blocked account
                    </MaterialButton>
                )}
            </div>
        </article>
    );
    return (
        <>
            <PageHeader
                title="Faculty accounts"
                subtitle="Approve or deny faculty access requests."
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
                                <AccountRow key={account.id} account={account} status="pending" />
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
                                <AccountRow key={account.id} account={account} status="approved" />
                            ))}
                        </div>
                    ) : (
                        <p className="inline-empty">No approved faculty accounts.</p>
                    )}
                </section>
                <section className="surface-panel">
                    <div className="panel-heading">
                        <div>
                            <p className="overline">DENIED ACCESS</p>
                            <h2>
                                Blocked requests <span className="count-badge">{rejected.length}</span>
                            </h2>
                        </div>
                    </div>
                    {rejected.length ? (
                        <div className="account-list">
                            {rejected.map(account => (
                                <AccountRow key={account.id} account={account} status="rejected" />
                            ))}
                        </div>
                    ) : (
                        <p className="inline-empty">No denied faculty requests.</p>
                    )}
                </section>
                <section className="surface-panel">
                    <div className="panel-heading">
                        <div>
                            <p className="overline">CAPSTONE REMOVAL</p>
                            <h2>
                                Deletion requests <span className="count-badge">{pendingProjectDeletions.length}</span>
                            </h2>
                        </div>
                    </div>
                    <p className="inline-empty">
                        Delete the project document from Firestore first, then choose Deleted. Rejected requests leave
                        the capstone published.
                    </p>
                    {pendingProjectDeletions.length ? (
                        <div className="account-list">
                            {pendingProjectDeletions.map(request => (
                                <article className="account-row deletion-request-row" key={request.id}>
                                    <span className="account-avatar">
                                        {(request.facultyName || "F").slice(0, 1).toUpperCase()}
                                    </span>
                                    <div className="account-details">
                                        <strong>{request.projectTitle}</strong>
                                        <span>{request.facultyName} · {request.facultyEmail}</span>
                                        <small>Project document ID: {request.projectId}</small>
                                    </div>
                                    <span className="status-pill status-pending">Pending</span>
                                    <div className="account-actions">
                                        <MaterialButton
                                            icon={Check}
                                            className="m3-compact"
                                            onClick={() => resolveProjectDeletion(request, "deleted")}
                                        >
                                            Deleted
                                        </MaterialButton>
                                        <MaterialButton
                                            variant="tonal"
                                            icon={X}
                                            className="m3-compact m3-delete"
                                            onClick={() => resolveProjectDeletion(request, "rejected")}
                                        >
                                            Rejected
                                        </MaterialButton>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <p className="inline-empty">No capstone deletion requests need review.</p>
                    )}
                    {resolvedProjectDeletions.length > 0 && (
                        <div className="account-list deletion-history">
                            {resolvedProjectDeletions.map(request => (
                                <article className="account-row" key={request.id}>
                                    <span className="account-avatar">
                                        {(request.facultyName || "F").slice(0, 1).toUpperCase()}
                                    </span>
                                    <div className="account-details">
                                        <strong>{request.projectTitle}</strong>
                                        <span>{request.facultyEmail}</span>
                                    </div>
                                    <span
                                        className={`status-pill ${request.status === "deleted" ? "status-approved" : "status-rejected"}`}
                                    >
                                        {request.status === "deleted" ? "Deleted" : "Rejected"}
                                    </span>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
                <section className="surface-panel">
                    <div className="panel-heading">
                        <div>
                            <p className="overline">FACULTY ACCOUNT REMOVAL</p>
                            <h2>
                                Account requests <span className="count-badge">{pendingAccountDeletions.length}</span>
                            </h2>
                        </div>
                    </div>
                    <p className="inline-empty">
                        To approve removal, delete the faculty profile from Firestore and the user from Firebase
                        Authentication, then choose Deleted.
                    </p>
                    {pendingAccountDeletions.length ? (
                        <div className="account-list">
                            {pendingAccountDeletions.map(request => (
                                <article className="account-row deletion-request-row" key={request.id}>
                                    <span className="account-avatar">
                                        {(request.facultyName || "F").slice(0, 1).toUpperCase()}
                                    </span>
                                    <div className="account-details">
                                        <strong>{request.facultyName}</strong>
                                        <span>{request.facultyEmail}</span>
                                        <small>Auth / profile UID: {request.facultyUid}</small>
                                    </div>
                                    <span className="status-pill status-pending">Pending</span>
                                    <div className="account-actions">
                                        <MaterialButton
                                            icon={Check}
                                            className="m3-compact"
                                            onClick={() => resolveAccountDeletion(request, "deleted")}
                                        >
                                            Deleted
                                        </MaterialButton>
                                        <MaterialButton
                                            variant="tonal"
                                            icon={X}
                                            className="m3-compact m3-delete"
                                            onClick={() => resolveAccountDeletion(request, "rejected")}
                                        >
                                            Rejected
                                        </MaterialButton>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <p className="inline-empty">No faculty account removal requests need review.</p>
                    )}
                    {resolvedAccountDeletions.length > 0 && (
                        <div className="account-list deletion-history">
                            {resolvedAccountDeletions.map(request => (
                                <article className="account-row" key={request.id}>
                                    <span className="account-avatar">
                                        {(request.facultyName || "F").slice(0, 1).toUpperCase()}
                                    </span>
                                    <div className="account-details">
                                        <strong>{request.facultyName}</strong>
                                        <span>{request.facultyEmail}</span>
                                    </div>
                                    <span
                                        className={`status-pill ${request.status === "deleted" ? "status-approved" : "status-rejected"}`}
                                    >
                                        {request.status === "deleted" ? "Deleted" : "Rejected"}
                                    </span>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

function LoginView({ role, setRole, login, requestAccess, requestOpen, setRequestOpen, session }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const requestRef = useRef(null);
    async function submitLogin(event) {
        event.preventDefault();
        setSubmitting(true);
        try {
            await login(role, email.trim().toLowerCase(), password);
        } finally {
            setSubmitting(false);
        }
    }
    async function submitRequest(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        setSubmitting(true);
        try {
            const created = await requestAccess({
                name: String(data.get("name")).trim(),
                email: String(data.get("email")).trim().toLowerCase(),
                password: String(data.get("password")),
            });
            if (created) {
                form.reset();
                setRequestOpen(false);
            }
        } finally {
            setSubmitting(false);
        }
    }
    return (
        <>
            <PageHeader
                title="Portal sign in"
                subtitle="Choose Faculty or Admin to continue to your workspace."
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
                    <form id="login-form" onSubmit={submitLogin}>
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
                                placeholder="name.sjc@phinmaed.com"
                            />
                        </label>
                        <label className="form-field">
                            <span>
                                Password <b>Required</b>
                            </span>
                            <input
                                type="password"
                                value={password}
                                onChange={event => setPassword(event.target.value)}
                                required
                                autoComplete="current-password"
                                placeholder="Enter your password"
                            />
                        </label>
                        <MaterialButton className="auth-submit" icon={ArrowForwardIcon} type="submit" disabled={submitting}>
                            Continue as {role}
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
                                icon={ArrowForwardIcon}
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
                                        <input name="email" type="email" required placeholder="name.sjc@phinmaed.com" />
                                    </label>
                                    <label className="form-field">
                                        <span>
                                            Password <b>Required</b>
                                        </span>
                                        <input
                                            name="password"
                                            type="password"
                                            required
                                            minLength="6"
                                            autoComplete="new-password"
                                            placeholder="At least 6 characters"
                                        />
                                    </label>
                                    <MaterialButton variant="tonal" icon={Send} type="submit" disabled={submitting}>
                                        Create faculty account
                                    </MaterialButton>
                                </form>
                            )}
                        </div>
                    )}
                    <p className="auth-disclaimer">
                        <Info size={15} /> Faculty accounts require admin approval before sign-in is enabled.
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
            leaderName: String(data.get("leaderName")).trim(),
            category: String(data.get("category") || ""),
            description: String(data.get("description")).trim(),
            imageUrl: String(data.get("imageUrl") || "").trim(),
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
                                    Capstone leader's name <b>Required</b>
                                </span>
                                <input
                                    name="leaderName"
                                    required
                                    maxLength="100"
                                    defaultValue={dialog.project.leaderName || dialog.project.facultyName || ""}
                                />
                            </label>
                            <ProjectCategoryMenu
                                key={dialog.project.id}
                                id="edit-project-category"
                                defaultValue={dialog.project.category || ""}
                            />
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
                                    Project image URL <b>Required</b>
                                </span>
                                <input
                                    name="imageUrl"
                                    type="url"
                                    required
                                    defaultValue={dialog.project.imageUrl || ""}
                                />
                                <small>Paste a public image URL for the showcase cover.</small>
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
            const button = event.target.closest(
                'button, input[type="button"], input[type="submit"], input[type="reset"], md-filled-button, md-filled-tonal-button, md-text-button, md-icon-button, md-menu-item',
            );
            if (button?.matches(":disabled") || button?.hasAttribute("disabled")) return;
            const link = event.target.closest(".rail-link");
            const target =
                button ||
                link?.querySelector(".rail-link-icon") ||
                event.target.closest(".rail-brand, .footer-top-link, .footer-brand");
            if (target) createRipple(target, event.clientX, event.clientY);
        }
        function onKeyDown(event) {
            if (event.repeat || !["Enter", " "].includes(event.key)) return;
            const button = event.target.closest(
                'button, input[type="button"], input[type="submit"], input[type="reset"], md-filled-button, md-filled-tonal-button, md-text-button, md-icon-button, md-menu-item',
            );
            if (!button || button.matches(":disabled") || button.hasAttribute("disabled")) return;
            const box = button.getBoundingClientRect();
            createRipple(button, box.left + box.width / 2, box.top + box.height / 2);
        }
        document.addEventListener("pointerdown", onPointer, true);
        document.addEventListener("keydown", onKeyDown, true);
        return () => {
            document.removeEventListener("pointerdown", onPointer, true);
            document.removeEventListener("keydown", onKeyDown, true);
        };
    }, []);
    return null;
}

export default function App() {
    const [projects, setProjects] = useState([]);
    const [facultyAccounts, setFacultyAccounts] = useState([]);
    const [projectDeletionRequests, setProjectDeletionRequests] = useState([]);
    const [accountDeletionRequests, setAccountDeletionRequests] = useState([]);
    const [session, setSession] = useState(null);
    const [view, setView] = useState(() =>
        new URLSearchParams(window.location.search).has("project") ? "project" : "showcase",
    );
    const [selectedProjectId, setSelectedProjectId] = useState(() =>
        new URLSearchParams(window.location.search).get("project"),
    );
    const [projectReturnView, setProjectReturnView] = useState("showcase");
    const [theme, setTheme] = useState(readTheme);
    const [authRole, setAuthRole] = useState("faculty");
    const [query, setQuery] = useState("");
    const [requestOpen, setRequestOpen] = useState(false);
    const [dialog, setDialog] = useState(null);
    const [toast, setToast] = useState("");
    const authCheckRef = useRef(0);
    const projectRouteTouchedRef = useRef(new URLSearchParams(window.location.search).has("project"));

    useLayoutEffect(() => {
        document.documentElement.dataset.theme = theme;
        document
            .querySelector('meta[name="theme-color"]')
            ?.setAttribute("content", theme === "dark" ? "#11150b" : "#f7fbea");
    }, [theme]);
    useEffect(() => {
        try {
            localStorage.setItem("portfolihub-theme", theme);
        } catch {}
    }, [theme]);

    useEffect(() => {
        if (!auth || !db) {
            setToast("Firebase configuration is missing. Check your VITE_FIREBASE settings.");
            return undefined;
        }

        let active = true;
        const unsubscribe = onAuthStateChanged(auth, async user => {
            const checkId = ++authCheckRef.current;
            if (!user) {
                setSession(null);
                setView(new URLSearchParams(window.location.search).has("project") ? "project" : "showcase");
                return;
            }

            try {
                const profile = await loadUserProfile(user.uid);
                if (!active || checkId !== authCheckRef.current) return;
                if (!profile) {
                    setSession(null);
                    return;
                }
                if (profile.status !== "approved") {
                    setSession(null);
                    setToast(
                        profile.status === "rejected"
                            ? "Your faculty access request was denied. Contact an administrator."
                            : "Your faculty account is awaiting admin approval.",
                    );
                    await firebaseSignOut(auth);
                    return;
                }
                setSession(profile);
                if (
                    !projectRouteTouchedRef.current &&
                    !new URLSearchParams(window.location.search).has("project")
                ) {
                    setView("overview");
                }
            } catch (error) {
                if (!active || checkId !== authCheckRef.current) return;
                setSession(null);
                setToast(`Could not load your Firebase profile: ${error.message}`);
            }
        });
        return () => {
            active = false;
            authCheckRef.current += 1;
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!db) return undefined;
        return onSnapshot(
            collection(db, "projects"),
            snapshot => {
                const records = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
                records.sort((left, right) => (right.createdAt?.seconds || 0) - (left.createdAt?.seconds || 0));
                setProjects(records);
            },
            error => setToast(`Could not load capstones: ${error.message}`),
        );
    }, []);

    useEffect(() => {
        if (!db || session?.role !== "admin") {
            setFacultyAccounts([]);
            setProjectDeletionRequests([]);
            setAccountDeletionRequests([]);
            return undefined;
        }
        const unsubscribeFaculty = onSnapshot(
            collection(db, "faculty"),
            snapshot => setFacultyAccounts(snapshot.docs.map(item => ({ ...item.data(), id: item.id }))),
            error => setToast(`Could not load faculty accounts: ${error.message}`),
        );
        const unsubscribeDeletionRequests = onSnapshot(
            collection(db, "deletionRequests"),
            snapshot => setProjectDeletionRequests(snapshot.docs.map(item => ({ ...item.data(), id: item.id }))),
            error => setToast(`Could not load capstone deletion requests: ${error.message}`),
        );
        const unsubscribeAccountRequests = onSnapshot(
            collection(db, "accountDeletionRequests"),
            snapshot => setAccountDeletionRequests(snapshot.docs.map(item => ({ ...item.data(), id: item.id }))),
            error => setToast(`Could not load faculty account requests: ${error.message}`),
        );
        return () => {
            unsubscribeFaculty();
            unsubscribeDeletionRequests();
            unsubscribeAccountRequests();
        };
    }, [session?.role]);
    useEffect(() => {
        if (!toast) return undefined;
        const timer = window.setTimeout(() => setToast(""), 3200);
        return () => window.clearTimeout(timer);
    }, [toast]);
    useEffect(() => {
        function restoreProjectRoute() {
            const projectId = new URLSearchParams(window.location.search).get("project");
            setSelectedProjectId(projectId);
            if (projectId) setView("project");
            else setView(current => (current === "project" ? projectReturnView : current));
        }
        window.addEventListener("popstate", restoreProjectRoute);
        return () => window.removeEventListener("popstate", restoreProjectRoute);
    }, [projectReturnView]);

    const notify = message => setToast(message);
    function openProject(project) {
        projectRouteTouchedRef.current = true;
        setProjectReturnView(view);
        setSelectedProjectId(project.id);
        const url = new URL(window.location.href);
        url.searchParams.set("project", project.id);
        window.history.pushState({ projectId: project.id }, "", url);
        setView("project");
    }
    function backFromProject() {
        const url = new URL(window.location.href);
        url.searchParams.delete("project");
        window.history.replaceState(window.history.state, "", url);
        setSelectedProjectId(null);
        setView(projectReturnView);
    }
    function navigate(destination) {
        const url = new URL(window.location.href);
        url.searchParams.delete("project");
        window.history.replaceState(window.history.state, "", url);
        setSelectedProjectId(null);
        if (destination === "portal" || destination === "faculty-login" || destination === "admin-login") {
            setAuthRole(destination === "admin-login" ? "admin" : "faculty");
            setView("login");
        } else setView(session || destination === "assistant" ? destination : "showcase");
        setQuery("");
    }
    async function signOut() {
        try {
            await firebaseSignOut(auth);
            setQuery("");
        } catch (error) {
            notify(`Could not sign out: ${error.message}`);
        }
    }
    async function login(role, email, password) {
        if (!auth || !db) return notify("Firebase is not configured. Check your environment settings.");
        try {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            const profile = await loadUserProfile(credential.user.uid);
            if (!profile) {
                await firebaseSignOut(auth);
                return notify("No Firestore profile is linked to this account. Contact an administrator.");
            }
            if (profile.role !== role) {
                await firebaseSignOut(auth);
                return notify(`This account is registered as ${profile.role}. Select the matching sign-in role.`);
            }
            if (profile.status !== "approved") {
                await firebaseSignOut(auth);
                return notify(
                    profile.status === "rejected"
                        ? "Your faculty access request was denied. Contact an administrator."
                        : "Your faculty account is awaiting admin approval.",
                );
            }
            setSession(profile);
            setView("overview");
            setQuery("");
        } catch (error) {
            notify(`Sign-in failed: ${error.message}`);
        }
    }
    async function requestAccess({ name, email, password }) {
        if (!auth || !db) return notify("Firebase is not configured. Check your environment settings.");
        const trimmedEmail = String(email || "")
            .trim()
            .toLowerCase();
        if (!isFacultyEmail(trimmedEmail)) {
            notify("Faculty email must use the .sjc@phinmaed.com format.");
            return false;
        }
        let credential;
        try {
            credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
            await setDoc(doc(db, "faculty", credential.user.uid), {
                name,
                email: trimmedEmail,
                role: "faculty",
                status: "pending",
                createdAt: serverTimestamp(),
            });
            await firebaseSignOut(auth);
            notify("Faculty account created. You can sign in after an admin approves it.");
            return true;
        } catch (error) {
            if (credential?.user && auth.currentUser?.uid === credential.user.uid) {
                await deleteUser(credential.user).catch(() => {});
            }
            notify(`Account registration failed: ${error.message}`);
            return false;
        }
    }
    async function publish(data) {
        if (!db || !session) return notify("Sign in with an approved account to publish a capstone.");
        const leaderName = String(data.leaderName || "").trim();
        if (!leaderName || leaderName.length > 100) return notify("Enter the capstone leader's name (up to 100 characters).");
        const category = String(data.category || "");
        if (!PROJECT_CATEGORIES.includes(category)) return notify("Choose a valid capstone category.");
        const repo = repositoryUrl(data.repositoryUrl);
        if (!repo) return notify("Enter a valid HTTP or HTTPS repository URL.");
        const imageUrl = String(data.imageUrl || "").trim();
        const image = imageUrl ? projectImage(imageUrl) : null;
        if (imageUrl && !image) return notify("Enter a valid public image URL for the capstone.");
        const videoUrl = String(data.demoVideoUrl || "").trim();
        const video = videoUrl ? projectVideo(videoUrl) : null;
        if (videoUrl && !video)
            return notify("Enter a supported HTTPS YouTube, Vimeo, or direct MP4, WebM, or Ogg URL.");
        try {
            await addDoc(collection(db, "projects"), {
                ...data,
                leaderName,
                category,
                imageUrl: image?.url || "",
                repositoryUrl: repo,
                demoVideoUrl: video?.url || "",
                facultyUid: session.uid,
                facultyEmail: session.email,
                facultyName: session.name,
                createdAt: serverTimestamp(),
                createdLabel: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
                    new Date(),
                ),
            });
            setQuery("");
            setView(session.role === "admin" ? "manage-projects" : "my-projects");
            notify("Capstone published to the public showcase.");
        } catch (error) {
            notify(`Could not publish capstone: ${error.message}`);
        }
    }
    async function saveProject(id, changes) {
        if (!db) return notify("Firebase is not configured.");
        const leaderName = String(changes.leaderName || "").trim();
        if (!leaderName || leaderName.length > 100) return notify("Enter the capstone leader's name (up to 100 characters).");
        const category = String(changes.category || "");
        if (!PROJECT_CATEGORIES.includes(category)) return notify("Choose a valid capstone category.");
        if (!repositoryUrl(changes.repositoryUrl)) return notify("Enter a valid HTTP or HTTPS repository URL.");
        const imageUrl = String(changes.imageUrl || "").trim();
        const image = imageUrl ? projectImage(imageUrl) : null;
        if (imageUrl && !image) return notify("Enter a valid public image URL for the capstone.");
        const videoUrl = String(changes.demoVideoUrl || "").trim();
        const video = videoUrl ? projectVideo(videoUrl) : null;
        if (videoUrl && !video)
            return notify("Enter a supported HTTPS YouTube, Vimeo, or direct MP4, WebM, or Ogg URL.");
        try {
            await updateDoc(doc(db, "projects", id), {
                ...changes,
                leaderName,
                category,
                imageUrl: image?.url || "",
                demoVideoUrl: video?.url || "",
                updatedAt: serverTimestamp(),
            });
            setDialog(null);
            notify("Capstone changes saved.");
        } catch (error) {
            notify(`Could not save capstone: ${error.message}`);
        }
    }
    async function deleteProject(id) {
        if (!db) return notify("Firebase is not configured.");
        try {
            await deleteDoc(doc(db, "projects", id));
            setDialog(null);
            if (selectedProjectId === id) backFromProject();
            notify("Capstone deleted from the showcase.");
        } catch (error) {
            notify(`Could not delete capstone: ${error.message}`);
        }
    }
    async function requestProjectDeletion(project) {
        if (!db || session?.role !== "faculty") return notify("Sign in as faculty to request capstone deletion.");
        const confirmed = window.confirm(`Ask an administrator to remove “${project.title}” from the showcase?`);
        if (!confirmed) return;
        try {
            const existing = await getDocs(
                query(
                    collection(db, "deletionRequests"),
                    where("projectId", "==", project.id),
                    where("requestedByUid", "==", session.uid),
                    where("status", "==", "pending"),
                ),
            );
            if (!existing.empty) return notify("A deletion request for this capstone is already awaiting review.");
            await addDoc(collection(db, "deletionRequests"), {
                projectId: project.id,
                projectTitle: project.title,
                facultyUid: project.facultyUid || session.uid,
                facultyEmail: session.email,
                facultyName: session.name,
                requestedByUid: session.uid,
                status: "pending",
                createdAt: serverTimestamp(),
            });
            notify("Deletion request sent to the admin for review.");
        } catch (error) {
            notify(`Could not send deletion request: ${error.message}`);
        }
    }
    async function resolveProjectDeletion(request, status) {
        if (!db || session?.role !== "admin") return notify("Only admins can resolve deletion requests.");
        if (!['deleted', 'rejected'].includes(status)) return;
        try {
            if (status === "deleted") {
                const project = await getDoc(doc(db, "projects", request.projectId));
                if (project.exists()) {
                    return notify("First delete the project document in Firestore, then mark this request Deleted.");
                }
            }
            await updateDoc(doc(db, "deletionRequests", request.id), {
                status,
                resolvedByUid: session.uid,
                resolvedAt: serverTimestamp(),
            });
            notify(status === "deleted" ? "Deletion request marked complete." : "Deletion request rejected.");
        } catch (error) {
            notify(`Could not update deletion request: ${error.message}`);
        }
    }
    async function requestAccountDeletion() {
        if (!db || session?.role !== "faculty") return notify("Only signed-in faculty can request account removal.");
        if (!window.confirm("Ask an administrator to remove your faculty account? Your access will end once the request is completed.")) {
            return;
        }
        try {
            const existing = await getDocs(
                query(
                    collection(db, "accountDeletionRequests"),
                    where("facultyUid", "==", session.uid),
                    where("status", "==", "pending"),
                ),
            );
            if (!existing.empty) return notify("Your account-removal request is already awaiting admin review.");
            await addDoc(collection(db, "accountDeletionRequests"), {
                facultyUid: session.uid,
                facultyEmail: session.email,
                facultyName: session.name,
                status: "pending",
                createdAt: serverTimestamp(),
            });
            notify("Account-removal request sent to the admin.");
        } catch (error) {
            notify(`Could not request account removal: ${error.message}`);
        }
    }
    async function resolveAccountDeletion(request, status) {
        if (!db || session?.role !== "admin") return notify("Only admins can resolve account-removal requests.");
        if (!['deleted', 'rejected'].includes(status)) return;
        try {
            if (status === "deleted") {
                const facultyProfile = await getDoc(doc(db, "faculty", request.facultyUid));
                if (facultyProfile.exists()) {
                    return notify("First remove this faculty profile and Auth user in Firebase Console, then mark it Deleted.");
                }
            }
            await updateDoc(doc(db, "accountDeletionRequests", request.id), {
                status,
                resolvedByUid: session.uid,
                resolvedAt: serverTimestamp(),
            });
            notify(status === "deleted" ? "Faculty account request marked complete." : "Faculty account request rejected.");
        } catch (error) {
            notify(`Could not update account-removal request: ${error.message}`);
        }
    }
    async function approveFaculty(id) {
        if (!db) return notify("Firebase is not configured.");
        try {
            await updateDoc(doc(db, "faculty", id), { status: "approved", updatedAt: serverTimestamp() });
            notify("Faculty account approved.");
        } catch (error) {
            notify(`Could not approve faculty account: ${error.message}`);
        }
    }
    async function denyFaculty(id) {
        if (!db) return notify("Firebase is not configured.");
        try {
            await updateDoc(doc(db, "faculty", id), { status: "rejected", updatedAt: serverTimestamp() });
            notify("Faculty request denied. The account remains blocked until deleted.");
        } catch (error) {
            notify(`Could not deny faculty request: ${error.message}`);
        }
    }
    async function removeRejectedFaculty(account) {
        window.alert(
            `To free ${account.email}, delete this user from Firebase Authentication, then delete faculty/${account.id} from Firestore. The blocked request will disappear from this list when its Firestore profile is removed.`,
        );
    }

    let content;
    if (view === "project") {
        const project = projects.find(item => item.id === selectedProjectId);
        const canRequestDelete =
            session?.role === "faculty" &&
            (project?.facultyUid === session.uid || project?.facultyEmail === session.email);
        content = (
            <ProjectArticleView
                project={project}
                onBack={backFromProject}
                canManage={session?.role === "admin"}
                canRequestDelete={canRequestDelete}
                onEdit={item => setDialog({ kind: "edit", project: item })}
                onDelete={item => setDialog({ kind: "delete", project: item })}
                onRequestDelete={requestProjectDeletion}
            />
        );
    } else if (view === "assistant") content = <AssistantView session={session} projects={projects} />;
    else if (!session)
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
                    onOpenProject={openProject}
                    onVoiceSearch={() => notify("Voice search is not available in this browser.")}
                />
            );
    else if (view === "faculty" && session.role === "admin")
        content = (
            <FacultyAccountsView
                session={session}
                facultyAccounts={facultyAccounts}
                projectDeletionRequests={projectDeletionRequests}
                accountDeletionRequests={accountDeletionRequests}
                approve={approveFaculty}
                deny={denyFaculty}
                removeRejected={removeRejectedFaculty}
                resolveProjectDeletion={resolveProjectDeletion}
                resolveAccountDeletion={resolveAccountDeletion}
            />
        );
    else if (view === "manage-projects" && session.role === "admin")
        content = (
            <ManageProjectsView
                session={session}
                projects={projects}
                query={query}
                setQuery={setQuery}
                openDialog={(kind, project) => setDialog({ kind, project })}
                onOpenProject={openProject}
                onVoiceSearch={() => notify("Voice search is not available in this browser.")}
            />
        );
    else if (view === "upload") content = <UploadView session={session} publish={publish} />;
    else if (view === "my-projects" && session.role === "faculty")
        content = (
            <StudentCapstonesView
                session={session}
                projects={projects}
                requestDeletion={requestProjectDeletion}
                requestAccountDeletion={requestAccountDeletion}
                onOpenProject={openProject}
            />
        );
    else if (view === "showcase")
        content = (
            <ShowcaseView
                session={session}
                projects={projects}
                query={query}
                setQuery={setQuery}
                navigate={navigate}
                    onOpenProject={openProject}
                onVoiceSearch={() => notify("Voice search is not available in this browser.")}
            />
        );
    else
        content = (
            <OverviewView
                session={session}
                projects={projects}
                facultyAccounts={facultyAccounts}
                navigate={navigate}
                onOpenProject={openProject}
            />
        );

    const routeKey = `${session?.role || "public"}-${view}-${authRole}`;
    return (
        <div className="app-shell">
            <NavRail
                session={session}
                view={view === "project" ? projectReturnView : view}
                navigate={navigate}
                signOut={signOut}
                theme={theme}
                toggleTheme={() => setTheme(current => (current === "dark" ? "light" : "dark"))}
            />
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
