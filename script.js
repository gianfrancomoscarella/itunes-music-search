let listaCanciones = [];

const btnDarkMode = document.getElementById("btnDarkMode");
const inputTitulo = document.getElementById("titulo");
const badgeLista  = document.getElementById("badgeLista");

// ── UTILS ──────────────────────────────────────────────────────
function debounce(fn, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

function mostrarMensaje(texto, tipo = "success") {
    Swal.fire({ icon: tipo, title: texto, timer: 2000, showConfirmButton: false });
}

function isDark() {
    return document.body.classList.contains("dark");
}

// ── BADGE ──────────────────────────────────────────────────────
function actualizarBadge() {
    if (listaCanciones.length === 0) {
        badgeLista.textContent = "";
        badgeLista.classList.add("hidden");
    } else {
        badgeLista.textContent = listaCanciones.length;
        badgeLista.classList.remove("hidden");
    }
}

// ── LOCALSTORAGE ───────────────────────────────────────────────
function guardarLista() {
    localStorage.setItem("listaCanciones", JSON.stringify(listaCanciones));
    actualizarBadge();
}

function cargarLista() {
    try {
        const data = localStorage.getItem("listaCanciones");
        if (data) listaCanciones = JSON.parse(data);
    } catch { listaCanciones = []; }
}

function guardarFormulario() {
    localStorage.setItem("formData", JSON.stringify({ titulo: inputTitulo.value }));
}

function precargarFormulario() {
    try {
        const data = JSON.parse(localStorage.getItem("formData"));
        if (data) inputTitulo.value = data.titulo || "";
    } catch {}
}

cargarLista();
precargarFormulario();
actualizarBadge();

// ── HISTORIAL ──────────────────────────────────────────────────
const MAX_HISTORIAL = 8;

function guardarHistorial(query) {
    if (!query || query.trim().length < 2) return;
    let h = obtenerHistorial().filter(q => q.toLowerCase() !== query.toLowerCase());
    h.unshift(query.trim());
    if (h.length > MAX_HISTORIAL) h = h.slice(0, MAX_HISTORIAL);
    localStorage.setItem("historialBusquedas", JSON.stringify(h));
    renderizarHistorial();
}

function obtenerHistorial() {
    try { return JSON.parse(localStorage.getItem("historialBusquedas")) || []; }
    catch { return []; }
}

function renderizarHistorial() {
    const contenedor = document.getElementById("historialBusquedas");
    if (!contenedor) return;
    const historial = obtenerHistorial();
    if (historial.length === 0) { contenedor.innerHTML = ""; return; }

    contenedor.innerHTML = `
        <div class="historial-inner">
            <span class="historial-label">🕘 Recientes:</span>
            ${historial.map(q => `<button class="chip-historial" data-query="${q}">${q}</button>`).join("")}
            <button class="btn-limpiar-historial">Limpiar</button>
        </div>
    `;

    contenedor.querySelectorAll(".chip-historial").forEach(chip => {
        chip.addEventListener("click", () => {
            inputTitulo.value = chip.dataset.query;
            inputTitulo.dispatchEvent(new Event("input"));
        });
    });

    contenedor.querySelector(".btn-limpiar-historial").addEventListener("click", () => {
        localStorage.removeItem("historialBusquedas");
        renderizarHistorial();
    });
}

// ── FAVORITOS ──────────────────────────────────────────────────
function yaEstaEnLista(titulo, artista) {
    return listaCanciones.some(
        c => c.titulo.toLowerCase() === titulo.toLowerCase() &&
             c.artista.toLowerCase() === artista.toLowerCase()
    );
}

function agregarCancion(cancion) {
    if (yaEstaEnLista(cancion.trackName, cancion.artistName)) {
        mostrarMensaje(`"${cancion.trackName}" ya está en tu lista`, "info");
        return;
    }
    listaCanciones.push({
        titulo:  cancion.trackName,
        artista: cancion.artistName,
        preview: cancion.previewUrl || null,
    });
    guardarLista();
    mostrarMensaje(`🎶 "${cancion.trackName}" agregada`);
}

function mostrarListaCanciones() {
    if (listaCanciones.length === 0) {
        Swal.fire({ icon: "info", title: "No hay canciones guardadas" });
        return;
    }

    let html = '<ul style="list-style:none; padding:0; margin:0;">';
    listaCanciones.forEach((c, i) => {
        html += `
            <li style="display:flex; justify-content:space-between; align-items:center;
                       margin:8px 0; padding:8px; border-radius:8px;
                       background:${isDark() ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"};
                       color:${isDark() ? "#eee" : "#333"};">
                <div id="cancion-${i}" style="cursor:pointer; flex-grow:1;">
                    🎶 <strong>${c.titulo}</strong> — ${c.artista}
                </div>
                <button class="btn-eliminar" data-index="${i}"
                    style="background:transparent; border:none; font-size:1.2rem; cursor:pointer; padding:0 5px; opacity:0.6;">
                    🗑️
                </button>
            </li>`;
    });
    html += `</ul>
        <button id="btnLimpiarLista" style="margin-top:10px; padding:8px 14px;
            background:#dc3545; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">
            🗑 Limpiar Lista
        </button>`;

    Swal.fire({
        title: `🎧 Mi Lista (${listaCanciones.length})`,
        html,
        width: 600,
        showConfirmButton: false,
        showCloseButton: true,
        background: isDark() ? "#1a1830" : "#fff",
        color:      isDark() ? "#eee"    : "#333",
        didOpen: () => {
            listaCanciones.forEach((c, i) => {
                document.getElementById(`cancion-${i}`)
                    ?.addEventListener("click", () => reproducirPreview(c));
            });

            document.querySelectorAll(".btn-eliminar").forEach(btn => {
                btn.addEventListener("click", e => {
                    listaCanciones.splice(Number(e.currentTarget.dataset.index), 1);
                    guardarLista();
                    Swal.close();
                    setTimeout(mostrarListaCanciones, 150);
                });
            });

            document.getElementById("btnLimpiarLista")?.addEventListener("click", () => {
                Swal.fire({
                    title: "¿Estás seguro?",
                    text: "Se eliminará toda tu lista",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Sí, limpiar",
                    cancelButtonText: "Cancelar",
                    background: isDark() ? "#1a1830" : "#fff",
                    color:      isDark() ? "#eee"    : "#333",
                }).then(r => {
                    if (r.isConfirmed) {
                        listaCanciones = [];
                        guardarLista();
                        Swal.fire({ icon: "success", title: "Lista vaciada", timer: 1500, showConfirmButton: false });
                    }
                });
            });
        }
    });
}

// ── PREVIEW ────────────────────────────────────────────────────
function reproducirPreview(cancion) {
    if (!cancion.preview) {
        mostrarMensaje(`"${cancion.titulo}" no tiene preview disponible`, "info");
        return;
    }
    Swal.fire({
        title: `🎵 ${cancion.titulo}`,
        html: `
            <em>${cancion.artista}</em><br>
            <audio id="player" controls autoplay style="margin-top:1rem; width:100%;">
                <source src="${cancion.preview}" type="audio/mpeg">
            </audio>
            <p style="font-size:0.85rem; color:#999; margin-top:8px;">🎧 Preview de 30 segundos</p>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        width: 400,
        background: isDark() ? "#1a1830" : "#fff",
        color:      isDark() ? "#eee"    : "#333",
    });
    setTimeout(() => document.getElementById("player")?.pause(), 30000);
}

// ── SUGERENCIA POR GÉNERO ──────────────────────────────────────
async function sugerenciaMusical() {
    const GENEROS = {
        rock: "Rock", pop: "Pop", jazz: "Jazz", hiphop: "Hip-Hop",
        classical: "Clásica", metal: "Metal", reggae: "Reggae",
        electronic: "Electrónica", latin: "Latina", "r&b": "R&B"
    };

    const { value: genero } = await Swal.fire({
        title: "🎵 Elegí un género",
        input: "select",
        inputOptions: GENEROS,
        inputPlaceholder: "Seleccioná un género",
        showCancelButton: true,
        confirmButtonText: "Buscar 🎶",
        cancelButtonText: "Cancelar",
        background: isDark() ? "#1a1830" : "#fff",
        color:      isDark() ? "#eee"    : "#333",
    });

    if (!genero) return;

    try {
        const res  = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(genero)}&entity=song&limit=25`);
        const data = await res.json();
        if (!data.results?.length) { Swal.fire({ icon: "info", title: "Sin resultados" }); return; }

        const cancion = data.results[Math.floor(Math.random() * data.results.length)];
        const audioHTML = cancion.previewUrl
            ? `<audio id="player" controls autoplay style="margin-top:1rem; width:100%;">
                   <source src="${cancion.previewUrl}" type="audio/mpeg">
               </audio>
               <p style="font-size:0.85rem; color:#999; margin-top:8px;">🎧 Preview de 30 segundos</p>`
            : `<p style="color:#999; margin-top:1rem;">⚠️ Sin preview disponible.</p>`;

        const result = await Swal.fire({
            title: `🎧 Sugerencia — ${GENEROS[genero]}`,
            html: `
                <strong>${cancion.trackName}</strong><br>
                de <em>${cancion.artistName}</em><br>
                <img src="${cancion.artworkUrl100}" width="180" style="margin-top:1rem; border-radius:12px;">
                ${audioHTML}
            `,
            showCancelButton: true,
            confirmButtonText: "✅ Agregar a mi lista",
            cancelButtonText: "Cerrar",
            background: isDark() ? "#1a1830" : "#fff",
            color:      isDark() ? "#eee"    : "#333",
            width: 420,
        });

        if (result.isConfirmed) agregarCancion(cancion);
        setTimeout(() => document.getElementById("player")?.pause(), 30000);

    } catch (err) {
        Swal.fire({ icon: "error", title: "Error", text: err.message });
    }
}

// ── RENDERIZAR RESULTADOS ──────────────────────────────────────
function renderizarResultados(results, contenedor, limpiar = true) {
    if (limpiar) contenedor.innerHTML = "";
    results.forEach(cancion => {
        const item = document.createElement("div");
        item.className = "resultado-item";

        const tienePreview = !!cancion.previewUrl;
        item.innerHTML = `
            <div class="resultado-info">
                <img src="${cancion.artworkUrl60}" alt="">
                <div style="min-width:0;">
                    <div class="resultado-titulo">${cancion.trackName}</div>
                    <div class="resultado-nombre">${cancion.artistName}</div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                ${!tienePreview ? '<span class="sin-preview" title="Sin preview">🔇</span>' : ''}
                <button class="btn-agregar">+ Agregar</button>
            </div>
        `;

        // Click en el item → preview
        item.addEventListener("click", e => {
            if (e.target.classList.contains("btn-agregar")) return;
            if (!tienePreview) return; // ícono ya indica que no hay preview, sin popup
            Swal.fire({
                title: `🎵 ${cancion.trackName}`,
                html: `
                    <em>${cancion.artistName}</em><br>
                    <img src="${cancion.artworkUrl100}" width="180" style="margin-top:1rem; border-radius:12px;"><br>
                    <audio id="player" controls autoplay style="margin-top:1rem; width:100%;">
                        <source src="${cancion.previewUrl}" type="audio/mpeg">
                    </audio>
                `,
                showConfirmButton: false,
                showCloseButton: true,
                width: 400,
                background: isDark() ? "#1a1830" : "#fff",
                color:      isDark() ? "#eee"    : "#333",
            });
            setTimeout(() => document.getElementById("player")?.pause(), 30000);
        });

        item.querySelector(".btn-agregar").addEventListener("click", e => {
            e.stopPropagation();
            agregarCancion(cancion);
        });

        contenedor.appendChild(item);
    });
}

// ── LIVE SEARCH ────────────────────────────────────────────────
function configurarLiveSearch() {
    const formulario = document.querySelector(".formulario");

    // Filtro género
    const filtroWrap = document.createElement("div");
    filtroWrap.className = "filtro-genero";
    filtroWrap.innerHTML = `
        <select id="filtroGenero">
            <option value="">🎵 Todos los géneros</option>
            <option value="rock">Rock</option>
            <option value="pop">Pop</option>
            <option value="jazz">Jazz</option>
            <option value="hip hop">Hip-Hop</option>
            <option value="classical">Clásica</option>
            <option value="metal">Metal</option>
            <option value="reggae">Reggae</option>
            <option value="electronic">Electrónica</option>
            <option value="latin">Latina</option>
            <option value="r&b">R&B</option>
        </select>
    `;
    formulario.insertAdjacentElement("afterend", filtroWrap);

    // Historial
    const historialDiv = document.createElement("div");
    historialDiv.id = "historialBusquedas";
    historialDiv.className = "historial-busquedas";
    filtroWrap.insertAdjacentElement("afterend", historialDiv);
    renderizarHistorial();

    // Spinner
    const spinner = document.createElement("div");
    spinner.id = "spinner";
    spinner.innerHTML = `<div class="loader"></div><p style="font-size:14px; color:rgba(255,255,255,0.4); margin-top:8px;">Buscando...</p>`;
    historialDiv.insertAdjacentElement("afterend", spinner);

    // Resultados
    const resultados = document.createElement("div");
    resultados.id = "resultadosLive";
    spinner.insertAdjacentElement("afterend", resultados);

    const selectGenero = document.getElementById("filtroGenero");

    // Canciones populares por defecto al cargar
    async function cargarPopulares() {
        spinner.style.display = "block";
        try {
            // Usamos el RSS feed de iTunes que sí tiene un top 10 real
        const res  = await fetch(`https://itunes.apple.com/us/rss/topsongs/limit=10/json`);
            const data = await res.json();
            spinner.style.display = "none";
            const rawResults = data.feed?.entry || data.results || [];
            const results = rawResults.map(e => e["im:name"] ? {
                trackName: e["im:name"].label,
                artistName: e["im:artist"].label,
                artworkUrl60: e["im:image"]?.[1]?.label || "",
                artworkUrl100: e["im:image"]?.[2]?.label || "",
                previewUrl: e?.link?.find?.(l => l?.attributes?.type === "audio/x-m4a")?.attributes?.href || null,
            } : e);
            if (results.length) {
                resultados.innerHTML = `<div style="
                    display:flex; align-items:center; gap:8px;
                    padding:10px 8px 8px;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                    margin-bottom:4px;">
                    <span style="font-size:1.3rem;">🔥</span>
                    <span style="
                        font-size:13px;
                        font-weight:800;
                        letter-spacing:2px;
                        text-transform:uppercase;
                        background: linear-gradient(90deg, #a78bfa, #f472b6, #fb923c);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;">Top Hits</span>
                    <span style="
                        font-size:10px;
                        color:rgba(255,255,255,0.3);
                        font-style:italic;
                </div>`;
                renderizarResultados(results, resultados, false);
            }
        } catch {
            spinner.style.display = "none";
        }
    }
    cargarPopulares();

    async function buscar() {
        const titulo = inputTitulo.value.trim();
        const genero = selectGenero.value;

        resultados.innerHTML = "";

        // Sin input → mostrar populares
        if (!titulo && !genero) {
            cargarPopulares();
            return;
        }

        spinner.style.display = "block";

        try {
            const q = [titulo, genero].filter(Boolean).join(" ");
            const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=10`;

            if (titulo) guardarHistorial(titulo);

            const res  = await fetch(url);
            if (!res.ok) throw new Error("Error al conectar con iTunes");
            const data = await res.json();

            spinner.style.display = "none";

            if (!data.results?.length) {
                resultados.innerHTML = "<p style='color:rgba(255,255,255,0.4); text-align:center; padding:12px;'>No se encontraron resultados</p>";
                return;
            }

            renderizarResultados(data.results, resultados);

        } catch (err) {
            spinner.style.display = "none";
            resultados.innerHTML = `<p style='color:#f87171; text-align:center; padding:12px;'>Error: ${err.message}</p>`;
        }
    }

    const buscarDebounced = debounce(buscar, 400);
    inputTitulo.addEventListener("input", buscarDebounced);
    selectGenero.addEventListener("change", buscarDebounced);
}

// ── DARK MODE ──────────────────────────────────────────────────
if (localStorage.getItem("modoOscuro") === "true") {
    document.body.classList.add("dark");
    btnDarkMode.textContent = "☀️ Modo Claro";
}

btnDarkMode.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const esDark = document.body.classList.contains("dark");
    btnDarkMode.textContent = esDark ? "☀️ Modo Claro" : "🌙 Modo Oscuro";
    localStorage.setItem("modoOscuro", esDark);
});

// ── EVENTOS ────────────────────────────────────────────────────
document.getElementById("btnMostrar").addEventListener("click", mostrarListaCanciones);
document.getElementById("btnSugerencia").addEventListener("click", sugerenciaMusical);
inputTitulo.addEventListener("input", guardarFormulario);
configurarLiveSearch();
