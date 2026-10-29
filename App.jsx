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
    ImageOff,
    LayoutDashboard,
    Layers,
    Lightbulb,
    LogIn,
    LogOut,
    Mail,
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
import { M3eButton } from "@m3e/react/button";
import { M3eButtonGroup } from "@m3e/react/button-group";
import { M3eFab } from "@m3e/react/fab";
import { M3eFabMenu, M3eFabMenuItem, M3eFabMenuTrigger } from "@m3e/react/fab-menu";
import { M3eIconButton } from "@m3e/react/icon-button";
import { M3eLoadingIndicator } from "@m3e/react/loading-indicator";
import { M3eNavItem } from "@m3e/react/nav-bar";
import { M3eNavRail } from "@m3e/react/nav-rail";
import { M3eOption } from "@m3e/react/option";
import { M3eSelect } from "@m3e/react/select";
import { M3eShape } from "@m3e/react/shape";
import { M3eTheme } from "@m3e/react/theme";
import { Hct, SchemeExpressive, argbFromHex, hexFromArgb } from "@material/material-color-utilities";
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
    doc,
    getDoc,
    getCountFromServer,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query as firestoreQuery,
    serverTimestamp,
    setDoc,
    startAfter,
    updateDoc,
    where,
} from "firebase/firestore";
import { auth, db, firebaseReady } from "./firebase";

const OLLAMA_BASE_URL = String(import.meta.env.VITE_OLLAMA_BASE_URL || "").trim().replace(/\/+$/, "");
const AUTO_APPROVE_FACULTY = String(import.meta.env.VITE_AUTO_APPROVE_FACULTY || "").trim().toLowerCase() === "true";
const PROJECT_CATEGORIES = ["Systems", "AI", "Applications", "Websites"];
const FACULTY_DEPARTMENTS = ["BSIT", "BSBA", "BSED", "BEED", "Other"];
const PROJECT_FILTERS = ["All", ...PROJECT_CATEGORIES];
const PROJECT_PAGE_SIZE = 24;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COLOR_PALETTES = [
    { id: "green", name: "Meadow", seed: "#97d945" },
    { id: "terracotta", name: "Terracotta", seed: "#b33b15" },
    { id: "blue", name: "Sky", seed: "#769cdf" },
    { id: "gold", name: "Sunflower", seed: "#ffde3f" },
    { id: "rose", name: "Rose", seed: "#f59bb7" },
    { id: "violet", name: "Orchid", seed: "#ea44ee" },
    { id: "copper", name: "Copper", seed: "#8a4c14" },
];

function LoadingNotice({ label, className = "" }) {
    return (
        <div className={`loading-notice ${className}`.trim()} role="status" aria-live="polite" aria-busy="true">
            <M3eLoadingIndicator variant="contained" aria-label={label} />
            <span>{label}</span>
        </div>
    );
}
const MATERIAL_COLOR_ROLES = [
    "primary",
    "onPrimary",
    "primaryContainer",
    "onPrimaryContainer",
    "primaryFixed",
    "primaryFixedDim",
    "onPrimaryFixed",
    "onPrimaryFixedVariant",
    "inversePrimary",
    "secondary",
    "onSecondary",
    "secondaryContainer",
    "onSecondaryContainer",
    "secondaryFixed",
    "secondaryFixedDim",
    "onSecondaryFixed",
    "onSecondaryFixedVariant",
    "tertiary",
    "onTertiary",
    "tertiaryContainer",
    "onTertiaryContainer",
    "tertiaryFixed",
    "tertiaryFixedDim",
    "onTertiaryFixed",
    "onTertiaryFixedVariant",
    "error",
    "onError",
    "errorContainer",
    "onErrorContainer",
    "background",
    "onBackground",
    "surface",
    "onSurface",
    "surfaceDim",
    "surfaceBright",
    "surfaceContainerLowest",
    "surfaceContainerLow",
    "surfaceContainer",
    "surfaceContainerHigh",
    "surfaceContainerHighest",
    "surfaceVariant",
    "onSurfaceVariant",
    "inverseSurface",
    "inverseOnSurface",
    "outline",
    "outlineVariant",
    "shadow",
    "scrim",
    "surfaceTint",
];

function makeExpressiveScheme(paletteId, theme) {
    const palette = COLOR_PALETTES.find(option => option.id === paletteId) || COLOR_PALETTES[0];
    return new SchemeExpressive(Hct.fromInt(argbFromHex(palette.seed)), theme === "dark", 0);
}

function expressiveSchemeColor(color, scheme, isDark) {
    if (color === 0xffffffff) return scheme.neutralPalette.tone(98);
    if (color === 0xff000000) return scheme.neutralPalette.tone(isDark ? 8 : 15);
    return color;
}

function expressivePalettePreview(paletteId, theme) {
    const scheme = makeExpressiveScheme(paletteId, theme);
    const isDark = theme === "dark";
    return {
        color: hexFromArgb(expressiveSchemeColor(scheme.primary, scheme, isDark)),
        onColor: hexFromArgb(expressiveSchemeColor(scheme.onPrimary, scheme, isDark)),
    };
}

function expressiveColorScheme(paletteId, theme) {
    const isDark = theme === "dark";
    const scheme = makeExpressiveScheme(paletteId, theme);
    return Object.fromEntries(
        MATERIAL_COLOR_ROLES.map(role => [
            `--md-sys-color-${role.replace(/[A-Z]/g, character => `-${character.toLowerCase()}`)}`,
            hexFromArgb(expressiveSchemeColor(scheme[role], scheme, isDark)),
        ]),
    );
}

const EXPRESSIVE_BACKGROUND_SHAPES = [
    { name: "puffy", color: "primary-container", size: 220 },
    { name: "4-leaf-clover", color: "tertiary-container", size: 170 },
    { name: "soft-boom", color: "secondary-container", size: 200 },
    { name: "ghost-ish", color: "primary-fixed-dim", size: 150 },
    { name: "puffy-diamond", color: "tertiary-fixed-dim", size: 190 },
    { name: "flower", color: "secondary-fixed", size: 160 },
];

function DriftingExpressiveShape({ name, color, size }) {
    const [trajectory] = useState(() => {
        const randomOffset = () => `${Math.round(Math.random() * 70 - 35)}vw`;
        const randomVerticalOffset = () => `${Math.round(Math.random() * 70 - 35)}vh`;
        return {
            left: `${Math.round(Math.random() * 100)}%`,
            top: `${Math.round(Math.random() * 100)}%`,
            duration: `${85 + Math.round(Math.random() * 50)}s`,
            delay: `${-Math.round(Math.random() * 80)}s`,
            "--drift-x-1": randomOffset(),
            "--drift-y-1": randomVerticalOffset(),
            "--drift-x-2": randomOffset(),
            "--drift-y-2": randomVerticalOffset(),
            "--drift-x-3": randomOffset(),
            "--drift-y-3": randomVerticalOffset(),
        };
    });

    return (
        <div
            className="expressive-shape-drift"
            style={{
                width: size,
                height: size,
                left: trajectory.left,
                top: trajectory.top,
                animationDuration: trajectory.duration,
                animationDelay: trajectory.delay,
                "--drift-x-1": trajectory["--drift-x-1"],
                "--drift-y-1": trajectory["--drift-y-1"],
                "--drift-x-2": trajectory["--drift-x-2"],
                "--drift-y-2": trajectory["--drift-y-2"],
                "--drift-x-3": trajectory["--drift-x-3"],
                "--drift-y-3": trajectory["--drift-y-3"],
                "--expressive-shape-color": `var(--md-sys-color-${color})`,
            }}
        >
            <M3eShape
                className="expressive-shape"
                name={name}
                aria-hidden="true"
            />
        </div>
    );
}

function ExpressiveBackground() {
    return (
        <div className="expressive-background" aria-hidden="true">
            {EXPRESSIVE_BACKGROUND_SHAPES.map(shape => (
                <DriftingExpressiveShape key={shape.name} {...shape} />
            ))}
        </div>
    );
}

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
- Faculty profiles include a department and can be marked deleted in Firestore; this deactivates website access while Firebase Authentication cleanup can be completed manually.
- Approved faculty can publish a capstone by providing its title, capstone leader's name, category (Systems, AI, Applications, or Websites), description, public image URL, and repository URL. A group contact email and demo video are optional.
- Publishing a capstone makes it public immediately. Deleted capstones remain in Firestore for record management but are hidden from the public showcase.
- Admins can edit or mark published capstones deleted.
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

function readPalette() {
    try {
        const savedPalette = localStorage.getItem("portfolihub-palette");
        return COLOR_PALETTES.some(palette => palette.id === savedPalette) ? savedPalette : "green";
    } catch {
        return "green";
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

function ProjectCategoryMenu({ id, defaultValue = "", error = "", onChange }) {
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
                            onChange?.(item);
                            menuRef.current?.close();
                        }}
                    >
                        <span slot="start">{item === category && <Check size={17} aria-hidden="true" />}</span>
                        <span slot="headline">{item}</span>
                    </md-menu-item>
                ))}
            </md-menu>
            {error && <small className="category-error" role="alert">{error}</small>}
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

function NavRail({ session, view, navigate, signOut, theme, toggleTheme, openSettings }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
        <>
            <M3eNavRail className="nav-rail" mode="compact" aria-label="Main navigation">
                <a
                    className="rail-brand"
                    href="#showcase"
                    aria-label="PortfoliHub showcase"
                    onClick={event => {
                        event.preventDefault();
                        navigate("showcase");
                    }}
                >
                    <span className="rail-brand-mark" aria-hidden="true">
                        <img
                            className="rail-brand-logo"
                            src={`${import.meta.env.BASE_URL}assets/logoapp-sidebar.png`}
                            alt=""
                        />
                    </span>
                    <span className="brand-name">PortfoliHub</span>
                </a>
                {roleItems.map(([destination, label, Icon]) => {
                    const active = view === destination || (view === "login" && destination === "portal");
                    return (
                        <M3eNavItem
                            key={destination}
                            className="rail-destination"
                            selected={active}
                            aria-label={label}
                            onClick={event => {
                                event.preventDefault();
                                navigate(destination);
                            }}
                        >
                            <Icon slot="icon" className="rail-icon" size={22} aria-hidden="true" />
                            {label}
                        </M3eNavItem>
                    );
                })}
            </M3eNavRail>
            <div className="rail-bottom">
                <M3eIconButton
                    className="rail-action"
                    variant="standard"
                    size="small"
                    aria-label="Settings"
                    title="Settings"
                    onClick={openSettings}
                >
                    <Settings2 size={22} aria-hidden="true" />
                </M3eIconButton>
                <M3eIconButton
                    className="rail-action"
                    variant="standard"
                    size="small"
                    aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                    title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                    onClick={toggleTheme}
                >
                    {theme === "dark" ? <Sun size={22} aria-hidden="true" /> : <Moon size={22} aria-hidden="true" />}
                </M3eIconButton>
                {session ? (
                    <M3eIconButton
                        className="rail-action"
                        variant="standard"
                        size="small"
                        aria-label="Sign out"
                        title="Sign out"
                        onClick={signOut}
                    >
                        <LogOut size={22} aria-hidden="true" />
                    </M3eIconButton>
                ) : null}
            </div>
            <div className="mobile-navigation" aria-label="Mobile navigation">
                <div className="mobile-navigation-actions">
                    <button
                        type="button"
                        className="mobile-navigation-action"
                        aria-label="Settings"
                        title="Settings"
                        onClick={openSettings}
                    >
                        <Settings2 size={21} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className="mobile-navigation-action"
                        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                        onClick={toggleTheme}
                    >
                        {theme === "dark" ? <Sun size={21} aria-hidden="true" /> : <Moon size={21} aria-hidden="true" />}
                    </button>
                    {session ? (
                        <button
                            type="button"
                            className="mobile-navigation-action"
                            aria-label="Sign out"
                            title="Sign out"
                            onClick={signOut}
                        >
                            <LogOut size={21} aria-hidden="true" />
                        </button>
                    ) : null}
                </div>
                <div className="mobile-navigation-menu">
                    <M3eFab
                        variant="primary-container"
                        size="small"
                        aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
                    >
                        <M3eFabMenuTrigger for="mobile-navigation-menu">
                            <Layers size={24} aria-hidden="true" />
                        </M3eFabMenuTrigger>
                    </M3eFab>
                    <M3eFabMenu
                        id="mobile-navigation-menu"
                        variant="primary"
                        onToggle={event => setMobileMenuOpen(event.currentTarget.matches(":popover-open"))}
                    >
                        {roleItems.map(([destination, label, Icon]) => {
                            const active = view === destination || (view === "login" && destination === "portal");
                            return (
                                <M3eFabMenuItem
                                    key={destination}
                                    aria-current={active ? "page" : undefined}
                                    onClick={() => navigate(destination)}
                                >
                                    <Icon slot="icon" size={20} aria-hidden="true" />
                                    {label}
                                </M3eFabMenuItem>
                            );
                        })}
                    </M3eFabMenu>
                </div>
            </div>
        </>
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
                    {connection === "checking" ? (
                        <LoadingNotice className="assistant-loading-notice" label="Checking assistant connection" />
                    ) : (
                        <span className={`assistant-connection connection-${connection}`} role="status">
                            <span className="connection-dot" />
                            {connectionLabel}
                        </span>
                    )}
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
                        <LoadingNotice className="assistant-thinking" label={`Waiting for ${model}`} />
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
                        <span className="brand-mark" aria-hidden="true">
                            <M3eShape className="brand-mark-shape" name="4-leaf-clover" />
                            <span className="brand-mark-text">PH</span>
                        </span>
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
    const [imageFailed, setImageFailed] = useState(false);
    function openProject(event) {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onOpen(project);
    }

    const projectHref = `?project=${encodeURIComponent(project.id)}`;
    return (
        <motion.article
            className="project-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.24 }}
        >
            <a
                className="project-card-link"
                href={projectHref}
                aria-label={`Open capstone: ${project.title}`}
                onClick={openProject}
            >
                {image &&
                    (imageFailed ? (
                        <div
                            className="project-image project-image-fallback"
                            role="img"
                            aria-label={`${project.title} image unavailable`}
                        >
                            <ImageOff size={24} aria-hidden="true" />
                            <span>Image unavailable</span>
                        </div>
                    ) : (
                        <img
                            className="project-image"
                            src={image.url}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={() => setImageFailed(true)}
                        />
                    ))}
                <div className="project-card-top">
                    <span className="published-tag">
                        <CheckCircle2 size={16} /> Published
                    </span>
                    <span className="project-date">{project.createdLabel || "Recently added"}</span>
                </div>
                <h3>{project.title}</h3>
                <span className="project-category-label">{project.category || "Capstone project"}</span>
                <p
                    className={`project-description${String(project.description || "").length > 180 ? " project-description-long" : ""}`}
                >
                    {project.description}
                    {String(project.description || "").length > 180 && (
                        <span className="project-read-more" aria-hidden="true">
                            Read more
                        </span>
                    )}
                </p>
                <div className="project-card-footer">
                    <span className="project-owner">
                        <School size={16} /> {project.leaderName || project.facultyName || "Capstone leader"}
                    </span>
                </div>
            </a>
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
    hasMoreProjects = false,
    loadingProjects = false,
    loadingMoreProjects = false,
    onLoadMore,
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
    const [visibleCount, setVisibleCount] = useState(12);
    const results = projects.filter(item => {
        const matchesCategory = category === "All" || item.category === category;
        const searchable = `${item.title} ${item.description} ${item.leaderName || item.facultyName || ""} ${item.category || ""}`;
        return matchesCategory && (!needle || searchable.toLowerCase().includes(needle));
    });
    useEffect(() => setVisibleCount(12), [query, category, projects]);
    const hasFilters = Boolean(needle) || category !== "All";
    if (loadingProjects && projects.length === 0) {
        return <LoadingNotice className="project-loading-notice" label="Loading capstones" />;
    }
    if (!results.length)
        return (
            <div className="empty-state">
                <FolderOpen className="empty-icon" size={28} />
                <h2>{hasFilters ? "No matching capstones" : emptyTitle}</h2>
                <p>{hasFilters ? "Try another search or category." : emptyMessage}</p>
                {hasMoreProjects && (
                    <MaterialButton
                        variant="tonal"
                        icon={ChevronDown}
                        disabled={loadingMoreProjects}
                        onClick={onLoadMore}
                    >
                        {loadingMoreProjects ? (
                            <>
                                <M3eLoadingIndicator variant="contained" aria-label="Loading capstones" />
                                <span>Loading capstones</span>
                            </>
                        ) : (
                            "Load more capstones"
                        )}
                    </MaterialButton>
                )}
                {!hasFilters && !session && (
                    <MaterialButton icon={ArrowForwardIcon} onClick={onFacultyLogin}>
                        Faculty sign in
                    </MaterialButton>
                )}
            </div>
        );
    return (
        <div className="project-grid">
            {results.slice(0, visibleCount).map((project, index) => (
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
            {(results.length > visibleCount || hasMoreProjects) && (
                <div className="project-grid-more">
                    <MaterialButton
                        variant="tonal"
                        icon={ChevronDown}
                        disabled={loadingMoreProjects}
                        onClick={() => {
                            if (results.length > visibleCount) setVisibleCount(count => count + 12);
                            else onLoadMore?.();
                        }}
                    >
                        {loadingMoreProjects
                            ? (
                                  <>
                                      <M3eLoadingIndicator variant="contained" aria-label="Loading capstones" />
                                      <span>Loading capstones</span>
                                  </>
                              )
                            : results.length > visibleCount
                              ? `Show 12 more (${results.length - visibleCount} remaining)`
                              : "Load more capstones"}
                    </MaterialButton>
                </div>
            )}
        </div>
    );
}

function ProjectArticleView({
    project,
    loading = false,
    onBack,
    canManage,
    canRequestDelete,
    onEdit,
    onDelete,
    onRequestDelete,
}) {
    if (!project) {
        if (loading) return <LoadingNotice className="project-loading-notice" label="Loading capstone details" />;
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
    const contactEmail = String(project.contactEmail || "").trim();
    const validContactEmail = EMAIL_PATTERN.test(contactEmail) && contactEmail.length <= 254;

    return (
        <article className="project-article">
            <MaterialButton className="article-back-button" variant="tonal" icon={ArrowLeft} onClick={onBack}>
                Back to projects
            </MaterialButton>
            <header className="project-article-header">
                <p className="overline">PHINMA SJC · BSIT CAPSTONE</p>
                <span className="project-category-label">{project.category || "Capstone project"}</span>
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

            {image && <ProjectArticleImage project={project} image={image} />}

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
                        {project.contributors?.length > 0 && (
                            <div>
                                <dt>Contributors</dt>
                                <dd>{project.contributors.join(", ")}</dd>
                            </div>
                        )}
                        {validContactEmail && (
                            <div>
                                <dt>Team contact</dt>
                                <dd>
                                    <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                                </dd>
                            </div>
                        )}
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
                    {validContactEmail && (
                        <MaterialButton
                            variant="tonal"
                            className="article-resource-button"
                            icon={Mail}
                            href={`mailto:${contactEmail}`}
                        >
                            Email capstone team
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
                                Mark capstone deleted
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

function ProjectArticleImage({ project, image }) {
    const [imageFailed, setImageFailed] = useState(false);
    if (imageFailed) {
        return (
            <div className="project-article-cover project-image-fallback" role="img" aria-label={`${project.title} image unavailable`}>
                <ImageOff size={28} aria-hidden="true" />
                <span>Image unavailable</span>
            </div>
        );
    }
    return (
        <img
            className="project-article-cover"
            src={image.url}
            alt={`${project.title} cover image`}
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
        />
    );
}

function ShowcaseView({
    session,
    projects,
    projectCount,
    hasMoreProjects,
    loadingProjects,
    loadingMoreProjects,
    loadMoreProjects,
    query,
    setQuery,
    navigate,
    onOpenProject,
    onVoiceSearch,
}) {
    const [category, setCategory] = useState("All");
    const renderCategoryGroup = (items, label) => (
        <M3eButtonGroup
            variant="connected"
            size="small"
            multi
            aria-label={label}
        >
            {items.map(item => (
                <M3eButton
                    key={item}
                    variant="tonal"
                    size="small"
                    toggle
                    selected={category === item}
                    onClick={() => setCategory(item)}
                >
                    {item}
                </M3eButton>
            ))}
        </M3eButtonGroup>
    );
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
                            Browse capstones <span className="count-badge">{projectCount}</span>
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
                <div className="project-category-filters">
                    <div className="project-category-filters-desktop">
                        {renderCategoryGroup(PROJECT_FILTERS, "Filter capstones by category")}
                    </div>
                    <div className="project-category-filters-mobile">
                        {renderCategoryGroup(PROJECT_FILTERS.slice(0, 3), "Filter capstones by category, first row")}
                        {renderCategoryGroup(PROJECT_FILTERS.slice(3), "Filter capstones by category, second row")}
                    </div>
                </div>
                <ProjectGrid
                    projects={projects}
                    query={query}
                    category={category}
                    hasMoreProjects={hasMoreProjects}
                    loadingProjects={loadingProjects}
                    loadingMoreProjects={loadingMoreProjects}
                    onLoadMore={loadMoreProjects}
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
    const [categoryError, setCategoryError] = useState("");
    const [preview, setPreview] = useState(null);
    const [publishing, setPublishing] = useState(false);
    function submit(event) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (!PROJECT_CATEGORIES.includes(String(data.get("category") || ""))) {
            setCategoryError("Choose a project category before previewing.");
            formRef.current?.querySelector("#upload-project-category")?.focus();
            return;
        }
        setPreview({
            title: String(data.get("title")).trim(),
            leaderName: String(data.get("leaderName")).trim(),
            category: String(data.get("category") || ""),
            contributors: String(data.get("contributors") || "")
                .split(/\r?\n/)
                .map(name => name.trim())
                .filter(Boolean),
            description: String(data.get("description")).trim(),
            imageUrl: String(data.get("imageUrl") || "").trim(),
            repositoryUrl: String(data.get("repositoryUrl")).trim(),
            contactEmail: String(data.get("contactEmail") || "").trim(),
            demoVideoUrl: String(data.get("demoVideoUrl")).trim(),
        });
    }
    async function publishPreview() {
        setPublishing(true);
        try {
            await publish(preview);
        } finally {
            setPublishing(false);
        }
    }
    return (
        <>
            <PageHeader
                title="Upload a capstone"
                subtitle="Complete the required details. Submission publishes the project immediately."
                session={session}
            />
            <section className="form-layout">
                {preview && (
                    <section className="surface-panel project-form project-preview" aria-labelledby="preview-heading">
                        <div className="form-heading">
                            <span className="step-pill">PREVIEW</span>
                            <h2 id="preview-heading">Review before publishing</h2>
                            <p>This capstone will be public as soon as you publish it.</p>
                        </div>
                        <article className="project-preview-card">
                            <p className="overline">{preview.category}</p>
                            <h3>{preview.title}</h3>
                            {projectImage(preview.imageUrl) && (
                                <img
                                    className="project-image"
                                    src={projectImage(preview.imageUrl).url}
                                    alt={`${preview.title} cover image preview`}
                                />
                            )}
                            <p className="project-description">{preview.description}</p>
                            <p className="preview-attribution">Leader: {preview.leaderName}</p>
                            {preview.contributors.length > 0 && (
                                <p className="preview-attribution">Contributors: {preview.contributors.join(", ")}</p>
                            )}
                            <p className="preview-attribution">Repository: {preview.repositoryUrl}</p>
                            {preview.contactEmail && (
                                <p className="preview-attribution">Team contact: {preview.contactEmail}</p>
                            )}
                        </article>
                        <div className="form-actions">
                            <MaterialButton variant="tonal" onClick={() => setPreview(null)}>
                                Back to editing
                            </MaterialButton>
                            <MaterialButton icon={ArrowForwardIcon} disabled={publishing} onClick={publishPreview}>
                                {publishing ? "Publishing capstone" : "Publish capstone"}
                            </MaterialButton>
                        </div>
                        {publishing && <LoadingNotice className="form-loading-notice" label="Publishing capstone" />}
                    </section>
                )}
                <form
                    id="upload-form"
                    className="surface-panel project-form"
                    ref={formRef}
                    onSubmit={submit}
                    hidden={Boolean(preview)}
                >
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
                    <ProjectCategoryMenu
                        key={categoryMenuVersion}
                        id="upload-project-category"
                        error={categoryError}
                        onChange={() => setCategoryError("")}
                    />
                    <label className="form-field">
                        <span>Other contributors</span>
                        <textarea
                            name="contributors"
                            rows="3"
                            maxLength="1200"
                            placeholder="One student name per line"
                        />
                        <small>Optional. Add up to 12 additional team members.</small>
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
                        <span>Group contact email</span>
                        <input
                            name="contactEmail"
                            type="email"
                            maxLength="254"
                            placeholder="team@example.com"
                        />
                        <small>Optional. This public address lets visitors contact the capstone team.</small>
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
                            Preview capstone
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

function ManageProjectsView({
    session,
    projects,
    query,
    setQuery,
    openDialog,
    onOpenProject,
    onVoiceSearch,
}) {
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
    loading = false,
    facultyAccounts,
    projectDeletionRequests,
    accountDeletionRequests,
    approve,
    deny,
    deactivate,
    resolveProjectDeletion,
    resolveAccountDeletion,
}) {
    const pending = facultyAccounts.filter(account => account.status === "pending");
    const active = facultyAccounts.filter(account => account.status === "approved");
    const rejected = facultyAccounts.filter(account => account.status === "rejected");
    const deleted = facultyAccounts.filter(account => account.status === "deleted");
    const [selectedDepartment, setSelectedDepartment] = useState("All");
    const visibleActive = selectedDepartment === "All"
        ? active
        : active.filter(account => (account.department || "Other") === selectedDepartment);
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
                <small>{account.department || "Department not set"}</small>
            </div>
            <span className={`status-pill status-${status}`}>
                {status === "pending" ? "Pending" : status === "approved" ? "Approved" : status === "deleted" ? "Deleted" : "Denied"}
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
                {(status === "rejected" || status === "approved") && (
                    <MaterialButton
                        variant="tonal"
                        icon={Trash2}
                        className="m3-compact m3-delete"
                        onClick={() => deactivate(account)}
                    >
                        {status === "approved" ? "Deactivate account" : "Mark deleted"}
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
            {loading && <LoadingNotice className="section-loading-notice" label="Loading faculty accounts and requests" />}
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
                            <p className="overline">DEACTIVATED ACCESS</p>
                            <h2>
                                Deleted faculty <span className="count-badge">{deleted.length}</span>
                            </h2>
                        </div>
                    </div>
                    {deleted.length ? (
                        <div className="account-list">
                            {deleted.map(account => (
                                <AccountRow key={account.id} account={account} status="deleted" />
                            ))}
                        </div>
                    ) : (
                        <p className="inline-empty">No deleted faculty accounts.</p>
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
                    <M3eButtonGroup variant="connected" size="small" aria-label="Faculty departments">
                        <M3eButton
                            variant="tonal"
                            size="small"
                            toggle
                            selected={selectedDepartment === "All"}
                            onClick={() => setSelectedDepartment("All")}
                        >
                            All departments
                        </M3eButton>
                        {FACULTY_DEPARTMENTS.map(department => (
                            <M3eButton
                                key={department}
                                variant="tonal"
                                size="small"
                                toggle
                                selected={selectedDepartment === department}
                                onClick={() => setSelectedDepartment(department)}
                            >
                                {department}
                            </M3eButton>
                        ))}
                    </M3eButtonGroup>
                    <div className="panel-heading faculty-active-heading">
                        <div>
                            <p className="overline">ACTIVE ACCOUNTS</p>
                            <h3>{selectedDepartment === "All" ? "All departments" : selectedDepartment} <span className="count-badge">{visibleActive.length}</span></h3>
                        </div>
                    </div>
                    {visibleActive.length ? (
                        <div className="account-list">
                            {visibleActive.map(account => (
                                <AccountRow key={account.id} account={account} status="approved" />
                            ))}
                        </div>
                    ) : (
                        <p className="inline-empty">No active faculty accounts in this department.</p>
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
                        Deleted marks the Firestore profile inactive immediately. Firebase Authentication cleanup can
                        be completed manually later.
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
    const [department, setDepartment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submittingLabel, setSubmittingLabel] = useState("Processing sign-in");
    const requestRef = useRef(null);
    async function submitLogin(event) {
        event.preventDefault();
        setSubmittingLabel("Signing in");
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
        setSubmittingLabel("Creating faculty account");
        setSubmitting(true);
        try {
            const created = await requestAccess({
                name: String(data.get("name")).trim(),
                email: String(data.get("email")).trim().toLowerCase(),
                password: String(data.get("password")),
                department,
            });
            if (created) {
                form.reset();
                setDepartment("");
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
                    {submitting && <LoadingNotice className="form-loading-notice" label={submittingLabel} />}
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
                                            Department <b>Required</b>
                                        </span>
                                        <M3eSelect
                                            name="department"
                                            required
                                            value={department}
                                            aria-label="Department"
                                            onChange={event => setDepartment(event.currentTarget.value || "")}
                                        >
                                            <M3eOption value="">Choose a department</M3eOption>
                                            {FACULTY_DEPARTMENTS.map(department => (
                                                <M3eOption key={department} value={department}>
                                                    {department}
                                                </M3eOption>
                                            ))}
                                        </M3eSelect>
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
    const [working, setWorking] = useState(false);
    const [workingLabel, setWorkingLabel] = useState("Saving capstone changes");
    if (!dialog) return null;
    const edit = dialog.kind === "edit";
    function closeDialog() {
        if (!working) close();
    }
    async function submit(event) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const changes = {
            title: String(data.get("title")).trim(),
            leaderName: String(data.get("leaderName")).trim(),
            category: String(data.get("category") || ""),
            contributors: String(data.get("contributors") || "")
                .split(/\r?\n/)
                .map(name => name.trim())
                .filter(Boolean),
            description: String(data.get("description")).trim(),
            imageUrl: String(data.get("imageUrl") || "").trim(),
            repositoryUrl: String(data.get("repositoryUrl")).trim(),
            contactEmail: String(data.get("contactEmail") || "").trim(),
            demoVideoUrl: String(data.get("demoVideoUrl")).trim(),
        };
        setWorkingLabel("Saving capstone changes");
        setWorking(true);
        try {
            await save(dialog.project.id, changes);
        } finally {
            setWorking(false);
        }
    }
    async function deleteCapstone() {
        setWorkingLabel("Deleting capstone");
        setWorking(true);
        try {
            await remove(dialog.project.id);
        } finally {
            setWorking(false);
        }
    }
    return (
        <motion.div
            className="react-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={closeDialog}
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
                    <MaterialIconButton icon={X} label="Close" disabled={working} onClick={closeDialog} />
                </div>
                {working && <LoadingNotice className="form-loading-notice" label={workingLabel} />}
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
                                <span>Other contributors</span>
                                <textarea
                                    name="contributors"
                                    rows="3"
                                    maxLength="1200"
                                    defaultValue={(dialog.project.contributors || []).join("\n")}
                                    placeholder="One student name per line"
                                />
                                <small>Optional. Add up to 12 additional team members.</small>
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
                                <span>Group contact email</span>
                                <input
                                    name="contactEmail"
                                    type="email"
                                    maxLength="254"
                                    placeholder="team@example.com"
                                    defaultValue={dialog.project.contactEmail || ""}
                                />
                                <small>Optional. This public address lets visitors contact the capstone team.</small>
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
                                <MaterialButton variant="tonal" disabled={working} onClick={closeDialog}>
                                    Cancel
                                </MaterialButton>
                                <MaterialButton icon={Check} type="submit" disabled={working}>
                                    {working ? "Saving changes" : "Save changes"}
                                </MaterialButton>
                            </div>
                        </form>
                    </>
                ) : (
                    <>
                        <h2 id="modal-heading">Mark this capstone as deleted?</h2>
                        <p className="dialog-copy">
                            <strong>{dialog.project.title}</strong> will remain in Firestore for record management,
                            but its status will change from published to deleted and it will disappear from the public
                            showcase.
                        </p>
                        <div className="dialog-actions">
                            <MaterialButton variant="tonal" disabled={working} onClick={closeDialog}>
                                Cancel
                            </MaterialButton>
                            <MaterialButton
                                className="m3-danger"
                                icon={Trash2}
                                disabled={working}
                                onClick={deleteCapstone}
                            >
                                {working ? "Updating status" : "Mark as deleted"}
                            </MaterialButton>
                        </div>
                    </>
                )}
            </motion.section>
        </motion.div>
    );
}

function SettingsDialog({ close, theme, setTheme, palette, setPalette }) {
    function handleRadioKeyDown(event) {
        const keyDirections = {
            ArrowDown: 1,
            ArrowRight: 1,
            ArrowUp: -1,
            ArrowLeft: -1,
        };
        const options = Array.from(event.currentTarget.querySelectorAll('[role="radio"]'));
        const currentIndex = options.indexOf(event.target.closest('[role="radio"]'));
        if (keyDirections[event.key] === undefined || currentIndex < 0 || options.length === 0) return;

        const nextIndex = (currentIndex + keyDirections[event.key] + options.length) % options.length;
        options[nextIndex].focus();
        options[nextIndex].click();
        event.preventDefault();
    }

    return (
        <motion.div
            className="react-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={event => {
                if (event.target === event.currentTarget) close();
            }}
        >
            <motion.section
                className="react-modal-content settings-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-heading"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                onKeyDown={event => {
                    if (event.key === "Escape") close();
                }}
                onMouseDown={event => event.stopPropagation()}
            >
                <div className="dialog-heading">
                    <span className="step-pill">PERSONALIZE</span>
                    <MaterialIconButton icon={X} label="Close settings" onClick={close} autoFocus />
                </div>
                <h2 id="settings-heading">Settings</h2>
                <section className="settings-group" aria-labelledby="settings-appearance-heading">
                    <h3 id="settings-appearance-heading">Appearance</h3>
                    <p>Choose the look that feels right for you.</p>
                    <div
                        className="settings-theme-options"
                        role="radiogroup"
                        aria-label="Color mode"
                        onKeyDown={handleRadioKeyDown}
                    >
                        {[
                            ["light", "Light", Sun],
                            ["dark", "Dark", Moon],
                        ].map(([value, label, Icon]) => (
                            <button
                                key={value}
                                type="button"
                                className="settings-theme-option"
                                role="radio"
                                aria-checked={theme === value}
                                tabIndex={theme === value ? 0 : -1}
                                onClick={() => setTheme(value)}
                            >
                                <Icon size={18} aria-hidden="true" />
                                {label}
                            </button>
                        ))}
                    </div>
                </section>
                <section className="settings-group" aria-labelledby="settings-palette-heading">
                    <h3 id="settings-palette-heading">Color palette</h3>
                    <p id="settings-palette-description">
                        Choose a dynamic Material 3 Expressive palette. Your choice is saved on this device.
                    </p>
                    <div
                        className="settings-palette-options"
                        role="radiogroup"
                        aria-labelledby="settings-palette-heading"
                        aria-describedby="settings-palette-description"
                        onKeyDown={handleRadioKeyDown}
                    >
                        {COLOR_PALETTES.map(option => {
                            const preview = expressivePalettePreview(option.id, theme);
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    className="settings-palette-option"
                                    role="radio"
                                    aria-checked={palette === option.id}
                                    tabIndex={palette === option.id ? 0 : -1}
                                    onClick={() => setPalette(option.id)}
                                >
                                    <span
                                        className="settings-palette-swatch"
                                        style={{
                                            "--palette-swatch": preview.color,
                                            "--palette-swatch-foreground": preview.onColor,
                                        }}
                                        aria-hidden="true"
                                    >
                                        <Check size={16} />
                                    </span>
                                    <span>{option.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>
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
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [loadingSelectedProject, setLoadingSelectedProject] = useState(false);
    const [authChecking, setAuthChecking] = useState(true);
    const [projectCount, setProjectCount] = useState(0);
    const [hasMoreProjects, setHasMoreProjects] = useState(false);
    const [loadingMoreProjects, setLoadingMoreProjects] = useState(false);
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
    const [palette, setPalette] = useState(readPalette);
    const [authRole, setAuthRole] = useState("faculty");
    const [query, setQuery] = useState("");
    const [requestOpen, setRequestOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [dialog, setDialog] = useState(null);
    const [toast, setToast] = useState("");
    const [loadingTasks, setLoadingTasks] = useState([]);
    const [loadingAdminData, setLoadingAdminData] = useState(false);
    const [deletingProject, setDeletingProject] = useState(null);
    const themeRootRef = useRef(null);
    const authCheckRef = useRef(0);
    const projectRouteTouchedRef = useRef(new URLSearchParams(window.location.search).has("project"));
    const projectCursorRef = useRef(null);
    const loadedMoreProjectsRef = useRef(false);
    const loadingMoreProjectsRef = useRef(false);
    const loadingTaskIdRef = useRef(0);

    useLayoutEffect(() => {
        const root = document.documentElement;
        const colors = expressiveColorScheme(palette, theme);
        const aliases = {
            "--surface": colors["--md-sys-color-background"],
            "--surface-low": colors["--md-sys-color-surface-container-low"],
            "--surface-high": colors["--md-sys-color-surface-container-high"],
            "--surface-white": colors["--md-sys-color-surface-container-lowest"],
            "--surface-dark": colors["--md-sys-color-surface-container-highest"],
            "--ink": colors["--md-sys-color-on-surface"],
            "--muted": colors["--md-sys-color-on-surface-variant"],
            "--line": colors["--md-sys-color-outline-variant"],
            "--primary": colors["--md-sys-color-primary"],
            "--primary-deep": colors["--md-sys-color-on-secondary-container"],
            "--primary-contrast": colors["--md-sys-color-on-primary"],
            "--primary-container": colors["--md-sys-color-primary-container"],
            "--on-primary-container": colors["--md-sys-color-on-primary-container"],
            "--accent": colors["--md-sys-color-primary-container"],
            "--accent-soft": colors["--md-sys-color-secondary-container"],
            "--mint": colors["--md-sys-color-tertiary-container"],
            "--lavender": colors["--md-sys-color-secondary-container"],
            "--tertiary": colors["--md-sys-color-tertiary"],
            "--tertiary-container": colors["--md-sys-color-tertiary-container"],
            "--on-tertiary-container": colors["--md-sys-color-on-tertiary-container"],
            "--danger": colors["--md-sys-color-error"],
            "--error-container": colors["--md-sys-color-error-container"],
            "--on-error": colors["--md-sys-color-on-error"],
            "--on-error-container": colors["--md-sys-color-on-error-container"],
            "--assistant-menu-bg": colors["--md-sys-color-surface-container-high"],
        };
        root.dataset.theme = theme;
        root.dataset.palette = palette;
        root.style.colorScheme = theme;
        for (const [property, value] of Object.entries({ ...colors, ...aliases })) {
            root.style.setProperty(property, value);
            themeRootRef.current?.style.setProperty(property, value);
        }
        themeRootRef.current?.style.setProperty("color-scheme", theme);
        document.querySelector('meta[name="theme-color"]')?.setAttribute("content", aliases["--surface"]);
    }, [theme, palette]);
    useEffect(() => {
        try {
            localStorage.setItem("portfolihub-theme", theme);
            localStorage.setItem("portfolihub-palette", palette);
        } catch (error) {
            console.error("Unable to save appearance preferences.", error);
            setToast("Appearance preferences could not be saved in this browser.");
        }
    }, [theme, palette]);

    useEffect(() => {
        if (!auth || !db) {
            setAuthChecking(false);
            setToast("Firebase configuration is missing. Check your VITE_FIREBASE settings.");
            return undefined;
        }

        let active = true;
        const unsubscribe = onAuthStateChanged(auth, async user => {
            const checkId = ++authCheckRef.current;
            if (!user) {
                setAuthChecking(false);
                setSession(null);
                setView(new URLSearchParams(window.location.search).has("project") ? "project" : "showcase");
                return;
            }

            setAuthChecking(true);
            try {
                const profile = await loadUserProfile(user.uid);
                if (!active || checkId !== authCheckRef.current) return;
                if (!profile) {
                    setAuthChecking(false);
                    setSession(null);
                    return;
                }

                const resolvedStatus = profile.status || (AUTO_APPROVE_FACULTY && profile.role === "faculty" ? "approved" : null);
                if (resolvedStatus !== "approved") {
                    setAuthChecking(false);
                    setSession(null);
                    setToast(
                        profile.status === "deleted"
                            ? "This faculty account has been deactivated. Contact an administrator if this was unexpected."
                            : profile.status === "rejected"
                              ? "Your faculty access request was denied. Contact an administrator."
                              : "Your faculty account is awaiting admin approval.",
                    );
                    await firebaseSignOut(auth);
                    return;
                }

                const normalizedProfile =
                    resolvedStatus === "approved" && profile.status !== "approved"
                        ? { ...profile, status: "approved" }
                        : profile;

                if (resolvedStatus === "approved" && profile.status !== "approved" && db) {
                    await updateDoc(doc(db, "faculty", user.uid), { status: "approved", updatedAt: serverTimestamp() });
                }

                setSession(normalizedProfile);
                setAuthChecking(false);
                if (
                    !projectRouteTouchedRef.current &&
                    !new URLSearchParams(window.location.search).has("project")
                ) {
                    setView("overview");
                }
            } catch (error) {
                if (!active || checkId !== authCheckRef.current) return;
                setAuthChecking(false);
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
        if (!db) {
            setLoadingProjects(false);
            return undefined;
        }
        const publicCatalog = !session?.role;
        const projectsQuery = publicCatalog
            ? firestoreQuery(collection(db, "projects"), orderBy("createdAt", "desc"), limit(PROJECT_PAGE_SIZE))
            : collection(db, "projects");
        projectCursorRef.current = null;
        loadedMoreProjectsRef.current = false;
        setLoadingProjects(true);
        setHasMoreProjects(false);
        return onSnapshot(
            projectsQuery,
            snapshot => {
                setLoadingProjects(false);
                const records = snapshot.docs
                    .map(item => ({ ...item.data(), status: item.data().status || "published", id: item.id }))
                    .filter(project => project.status !== "deleted");
                records.sort((left, right) => (right.createdAt?.seconds || 0) - (left.createdAt?.seconds || 0));
                if (publicCatalog) {
                    if (!loadedMoreProjectsRef.current) projectCursorRef.current = snapshot.docs.at(-1) || null;
                    setProjects(current => {
                        const snapshotIds = new Set(snapshot.docs.map(project => project.id));
                        return [
                            ...records,
                            ...current.filter(project => !snapshotIds.has(project.id) && project.status !== "deleted"),
                        ];
                    });
                    setHasMoreProjects(snapshot.docs.length === PROJECT_PAGE_SIZE);
                    getCountFromServer(collection(db, "projects"))
                        .then(result => {
                            setProjectCount(records.length);
                        })
                        .catch(error => {
                            setToast(`Could not count capstones: ${error.message}`);
                        });
                } else {
                    setProjects(records);
                    setProjectCount(records.length);
                }
            },
            error => {
                setLoadingProjects(false);
                setToast(`Could not load capstones: ${error.message}`);
            },
        );
    }, [session?.role]);

    useEffect(() => {
        if (!db || session?.role !== "admin") {
            setFacultyAccounts([]);
            setProjectDeletionRequests([]);
            setAccountDeletionRequests([]);
            setLoadingAdminData(false);
            return undefined;
        }
        setLoadingAdminData(true);
        const receivedInitialSnapshots = new Set();
        function markSnapshotLoaded(key) {
            receivedInitialSnapshots.add(key);
            if (receivedInitialSnapshots.size === 3) setLoadingAdminData(false);
        }
        const unsubscribeFaculty = onSnapshot(
            collection(db, "faculty"),
            snapshot => {
                setFacultyAccounts(snapshot.docs.map(item => ({ ...item.data(), id: item.id })));
                markSnapshotLoaded("faculty");
            },
            error => {
                setToast(`Could not load faculty accounts: ${error.message}`);
                markSnapshotLoaded("faculty");
            },
        );
        const unsubscribeDeletionRequests = onSnapshot(
            collection(db, "deletionRequests"),
            snapshot => {
                setProjectDeletionRequests(snapshot.docs.map(item => ({ ...item.data(), id: item.id })));
                markSnapshotLoaded("project-deletions");
            },
            error => {
                setToast(`Could not load capstone deletion requests: ${error.message}`);
                markSnapshotLoaded("project-deletions");
            },
        );
        const unsubscribeAccountRequests = onSnapshot(
            collection(db, "accountDeletionRequests"),
            snapshot => {
                setAccountDeletionRequests(snapshot.docs.map(item => ({ ...item.data(), id: item.id })));
                markSnapshotLoaded("account-deletions");
            },
            error => {
                setToast(`Could not load faculty account requests: ${error.message}`);
                markSnapshotLoaded("account-deletions");
            },
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
    useEffect(() => {
        if (!selectedProjectId || projects.some(project => project.id === selectedProjectId)) {
            setLoadingSelectedProject(false);
            return undefined;
        }
        if (!db) {
            setLoadingSelectedProject(false);
            return undefined;
        }
        let active = true;
        setLoadingSelectedProject(true);
        getDoc(doc(db, "projects", selectedProjectId))
            .then(snapshot => {
                if (!active || !snapshot.exists()) return;
                const project = { ...snapshot.data(), status: snapshot.data().status || "published", id: snapshot.id };
                setProjects(current => {
                    const remaining = current.filter(item => item.id !== project.id);
                    return [...remaining, project].sort(
                        (left, right) => (right.createdAt?.seconds || 0) - (left.createdAt?.seconds || 0),
                    );
                });
            })
            .catch(error => {
                if (active) setToast(`Could not load capstone: ${error.message}`);
            })
            .finally(() => {
                if (active) setLoadingSelectedProject(false);
            });
        return () => {
            active = false;
        };
    }, [selectedProjectId, projects]);

    const notify = message => setToast(message);
    function trackLoading(label, operation) {
        const id = ++loadingTaskIdRef.current;
        let visible = false;
        const timer = window.setTimeout(() => {
            visible = true;
            setLoadingTasks(current => [...current, { id, label }]);
        }, 180);
        return Promise.resolve()
            .then(operation)
            .finally(() => {
                window.clearTimeout(timer);
                if (visible) setLoadingTasks(current => current.filter(task => task.id !== id));
            });
    }
    async function loadMoreProjects() {
        if (!db || !projectCursorRef.current || loadingMoreProjectsRef.current || !hasMoreProjects) return;
        loadingMoreProjectsRef.current = true;
        setLoadingMoreProjects(true);
        try {
            const page = await getDocs(
                firestoreQuery(
                    collection(db, "projects"),
                    orderBy("createdAt", "desc"),
                    startAfter(projectCursorRef.current),
                    limit(PROJECT_PAGE_SIZE),
                ),
            );
            const records = page.docs
            .map(item => ({ ...item.data(), status: item.data().status || "published", id: item.id }))
                .filter(project => project.status !== "deleted");
            if (page.docs.length) projectCursorRef.current = page.docs.at(-1);
            loadedMoreProjectsRef.current = true;
            setProjects(current => {
                const existingIds = new Set(current.map(project => project.id));
                return [...current, ...records.filter(project => !existingIds.has(project.id))].sort(
                    (left, right) => (right.createdAt?.seconds || 0) - (left.createdAt?.seconds || 0),
                );
            });
            setHasMoreProjects(page.docs.length === PROJECT_PAGE_SIZE);
        } catch (error) {
            notify(`Could not load more capstones: ${error.message}`);
        } finally {
            loadingMoreProjectsRef.current = false;
            setLoadingMoreProjects(false);
        }
    }
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
                    profile.status === "deleted"
                        ? "This faculty account has been deactivated. Contact an administrator."
                        : profile.status === "rejected"
                          ? "Your faculty access request was denied. Contact an administrator."
                          : "Your faculty account is awaiting admin approval.",
                );
            }
            setSession(profile);
            setView("overview");
            setQuery("");
        } catch (error) {
            const message =
                error.code === "auth/invalid-credential" || error.code === "auth/user-not-found"
                    ? "No matching Firebase Authentication account was found. Register through the website first, then wait for admin approval; creating only a Firestore faculty document is not enough."
                    : error.code === "auth/wrong-password"
                      ? "The password is incorrect for this Firebase Authentication account."
                      : error.message;
            notify(`Sign-in failed: ${message}`);
        }
    }
    async function requestAccess({ name, email, password, department }) {
        if (!auth || !db) return notify("Firebase is not configured. Check your environment settings.");
        const trimmedEmail = String(email || "")
            .trim()
            .toLowerCase();
        if (!isFacultyEmail(trimmedEmail)) {
            notify("Faculty email must use the .sjc@phinmaed.com format.");
            return false;
        }
        if (!FACULTY_DEPARTMENTS.includes(department)) {
            notify("Choose the faculty member's department.");
            return false;
        }
        let credential;
        try {
            credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
            const nextStatus = AUTO_APPROVE_FACULTY ? "approved" : "pending";
            await setDoc(doc(db, "faculty", credential.user.uid), {
                name,
                email: trimmedEmail,
                role: "faculty",
                department,
                status: nextStatus,
                createdAt: serverTimestamp(),
            });
            if (AUTO_APPROVE_FACULTY) {
                notify("Faculty account created and approved for local capstone uploads.");
            } else {
                await firebaseSignOut(auth);
                notify("Faculty account created. You can sign in after an admin approves it.");
            }
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
        const contributors = Array.isArray(data.contributors)
            ? data.contributors.map(name => String(name).trim()).filter(Boolean)
            : [];
        if (contributors.length > 12 || contributors.some(name => name.length > 100)) {
            return notify("Enter up to 12 contributor names, each no longer than 100 characters.");
        }
        const repo = repositoryUrl(data.repositoryUrl);
        if (!repo) return notify("Enter a valid HTTP or HTTPS repository URL.");
        const contactEmail = String(data.contactEmail || "").trim();
        if (contactEmail && (contactEmail.length > 254 || !EMAIL_PATTERN.test(contactEmail))) {
            return notify("Enter a valid group contact email address.");
        }
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
                contributors,
                imageUrl: image?.url || "",
                repositoryUrl: repo,
                contactEmail,
                demoVideoUrl: video?.url || "",
                facultyUid: session.uid,
                facultyEmail: session.email,
                facultyName: session.name,
                status: "published",
                createdAt: serverTimestamp(),
                createdLabel: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
                    new Date(),
                ),
            });
            setQuery("");
            setView(session.role === "admin" ? "manage-projects" : "my-projects");
            notify("Capstone published to the public showcase.");
        } catch (error) {
            const message =
                error.code === "permission-denied"
                    ? `Firestore rejected this write. Confirm the deployed Firestore rules are current and this account has an approved admin or faculty profile. (${error.message})`
                    : error.message;
            notify(`Could not publish capstone: ${message}`);
        }
    }
    async function saveProject(id, changes) {
        if (!db) return notify("Firebase is not configured.");
        const leaderName = String(changes.leaderName || "").trim();
        if (!leaderName || leaderName.length > 100) return notify("Enter the capstone leader's name (up to 100 characters).");
        const category = String(changes.category || "");
        if (!PROJECT_CATEGORIES.includes(category)) return notify("Choose a valid capstone category.");
        const contributors = Array.isArray(changes.contributors)
            ? changes.contributors.map(name => String(name).trim()).filter(Boolean)
            : [];
        if (contributors.length > 12 || contributors.some(name => name.length > 100)) {
            return notify("Enter up to 12 contributor names, each no longer than 100 characters.");
        }
        if (!repositoryUrl(changes.repositoryUrl)) return notify("Enter a valid HTTP or HTTPS repository URL.");
        const contactEmail = String(changes.contactEmail || "").trim();
        if (contactEmail && (contactEmail.length > 254 || !EMAIL_PATTERN.test(contactEmail))) {
            return notify("Enter a valid group contact email address.");
        }
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
                contributors,
                contactEmail,
                imageUrl: image?.url || "",
                demoVideoUrl: video?.url || "",
                status: changes.status || "published",
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
        const project = projects.find(item => item.id === id);
        setDeletingProject(project || { id });
        setProjects(current => current.filter(item => item.id !== id));
        try {
            await updateDoc(doc(db, "projects", id), {
                status: "deleted",
                deletedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            setDialog(null);
            if (selectedProjectId === id) backFromProject();
            notify("Capstone marked deleted and removed from the public showcase.");
        } catch (error) {
            if (project) setProjects(current => [project, ...current]);
            notify(`Could not delete capstone: ${error.message}`);
        } finally {
            setDeletingProject(null);
        }
    }
    async function requestProjectDeletion(project) {
        if (!db || session?.role !== "faculty") return notify("Sign in as faculty to request capstone deletion.");
        const confirmed = window.confirm(`Ask an administrator to remove “${project.title}” from the showcase?`);
        if (!confirmed) return;
        return trackLoading("Sending capstone removal request", async () => {
            try {
                const existing = await getDocs(
                    firestoreQuery(
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
        });
    }
    async function resolveProjectDeletion(request, status) {
        if (!db || session?.role !== "admin") return notify("Only admins can resolve deletion requests.");
        if (!['deleted', 'rejected'].includes(status)) return;
        try {
            if (status === "deleted") {
                await updateDoc(doc(db, "projects", request.projectId), {
                    status: "deleted",
                    deletedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
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
        return trackLoading("Sending account removal request", async () => {
            try {
                const existing = await getDocs(
                    firestoreQuery(
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
        });
    }
    async function resolveAccountDeletion(request, status) {
        if (!db || session?.role !== "admin") return notify("Only admins can resolve account-removal requests.");
        if (!['deleted', 'rejected'].includes(status)) return;
        try {
            if (status === "deleted") {
                await updateDoc(doc(db, "faculty", request.facultyUid), {
                    status: "deleted",
                    deletedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
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
            notify("Faculty access approved. The faculty member must already have a Firebase Authentication account created through registration.");
        } catch (error) {
            notify(`Could not approve faculty account: ${error.message}`);
        }
    }
    async function deactivateFaculty(account) {
        if (!db || session?.role !== "admin") return notify("Only admins can deactivate faculty accounts.");
        const confirmed = window.confirm(
            `Mark ${account.name || account.email} as deleted? Their Firebase credentials will remain until an administrator removes them manually, but the website will block sign-in immediately.`,
        );
        if (!confirmed) return;
        try {
            await updateDoc(doc(db, "faculty", account.id), {
                status: "deleted",
                deletedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            notify("Faculty account marked deleted. Remove the Firebase Authentication user manually when ready.");
        } catch (error) {
            notify(`Could not deactivate faculty account: ${error.message}`);
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
    let content;
    if (view === "project") {
        const project = projects.find(item => item.id === selectedProjectId);
        const canRequestDelete =
            session?.role === "faculty" &&
            (project?.facultyUid === session.uid || project?.facultyEmail === session.email);
        content = (
            <ProjectArticleView
                project={project}
                loading={loadingSelectedProject}
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
                    projectCount={projectCount}
                    hasMoreProjects={hasMoreProjects}
                    loadingProjects={loadingProjects}
                    loadingMoreProjects={loadingMoreProjects}
                    loadMoreProjects={loadMoreProjects}
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
                loading={loadingAdminData}
                facultyAccounts={facultyAccounts}
                projectDeletionRequests={projectDeletionRequests}
                accountDeletionRequests={accountDeletionRequests}
                approve={id => trackLoading("Approving faculty account", () => approveFaculty(id))}
                deny={id => trackLoading("Updating faculty access", () => denyFaculty(id))}
                deactivate={account => trackLoading("Deactivating faculty account", () => deactivateFaculty(account))}
                resolveProjectDeletion={(request, status) =>
                    trackLoading("Updating capstone removal request", () => resolveProjectDeletion(request, status))
                }
                resolveAccountDeletion={(request, status) =>
                    trackLoading("Updating faculty removal request", () => resolveAccountDeletion(request, status))
                }
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
    else if (view === "upload")
        content = (
            <UploadView
                session={session}
                publish={publish}
            />
        );
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
                projectCount={projectCount}
                hasMoreProjects={hasMoreProjects}
                loadingProjects={loadingProjects}
                loadingMoreProjects={loadingMoreProjects}
                loadMoreProjects={loadMoreProjects}
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
    const paletteSeed = COLOR_PALETTES.find(option => option.id === palette)?.seed || COLOR_PALETTES[0].seed;
    return (
        <M3eTheme
            ref={themeRootRef}
            className="m3e-motion-theme"
            color={paletteSeed}
            scheme={theme}
            variant="expressive"
            motion="expressive"
        >
            <div className="app-shell">
                <ExpressiveBackground />
                <NavRail
                    session={session}
                    view={view === "project" ? projectReturnView : view}
                    navigate={navigate}
                    signOut={() => trackLoading("Signing out", signOut)}
                    theme={theme}
                    toggleTheme={() => setTheme(current => (current === "dark" ? "light" : "dark"))}
                    openSettings={() => setSettingsOpen(true)}
                />
                <main className="app-main">
                    {authChecking && (
                        <LoadingNotice className="network-loading-notice" label="Checking sign-in status" />
                    )}
                    {loadingTasks.length > 0 && (
                        <LoadingNotice
                            className="network-loading-notice"
                            label={loadingTasks.at(-1).label}
                        />
                    )}
                    {deletingProject && (
                        <LoadingNotice
                            className="network-loading-notice"
                            label="Updating capstone status and refreshing the showcase"
                        />
                    )}
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
                    {settingsOpen && (
                        <SettingsDialog
                            close={() => setSettingsOpen(false)}
                            theme={theme}
                            setTheme={setTheme}
                            palette={palette}
                            setPalette={setPalette}
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
        </M3eTheme>
    );
}
