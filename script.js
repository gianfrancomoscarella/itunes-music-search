let listaCanciones = [];

const mensajes = document.getElementById("mensajes");
const btnDarkMode = document.getElementById("btnDarkMode");
const inputTitulo = document.getElementById("titulo");
const inputArtista = document.getElementById("artista");

const isAlpha = str => /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ0-9\s\-']+$/.test(str);

function debounce(fn, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

function mostrarMensaje(texto, tipo = "info") {
    Swal.fire({
        icon: tipo === "error" ? "error" : "success",
        title: texto,
        timer: 2000,
        showConfirmButton: false
    });
}

/* Guardar lista y formulario */
function guardarLista() {
    localStorage.setItem('listaCanciones', JSON.stringify(listaCanciones));
}
function guardarFormulario() {
    const titulo = document.getElementById("titulo").value;
    const artista = document.getElementById("artista").value;
    localStorage.setItem('formData', JSON.stringify({ titulo, artista }));
}

function cargarLista() {
    try {
        const data = localStorage.getItem('listaCanciones');
        if (data) listaCanciones = JSON.parse(data);
    } catch (e) {
        listaCanciones = [];
        console.error("Error cargando lista:", e);
    }
}

function precargarFormulario() {
    const data = localStorage.getItem('formData');
    if (data) {
        const { titulo, artista } = JSON.parse(data);
        document.getElementById("titulo").value = titulo || "";
        document.getElementById("artista").value = artista || "";
    }
}
cargarLista();
precargarFormulario();

function mostrarListaCanciones() {
    if (listaCanciones.length === 0) {
        Swal.fire({ icon: "info", title: "No hay canciones guardadas" });
        return;
    }
    let html = '<ul style="list-style:none; padding:0;">';
    listaCanciones.forEach((c, i) => {
        html += `
            <li style="display:flex; justify-content:space-between; align-items:center; margin:8px 0; padding:8px; border-radius:5px; background:#f1f1f1;">
                <div id="cancion-${i}" style="cursor:pointer; flex-grow: 1;">
                    🎶 <strong>${c.titulo}</strong> - ${c.artista}
                </div>
                <button class="btn-eliminar" data-index="${i}" style="
                    background: transparent;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                    padding: 0 5px;
                    margin-left: 10px;
                ">🗑️</button>
            </li>
        `;
    });
    html += '</ul>';
    html += `<button id="btnLimpiarLista" style="
                margin-top:10px;
                padding:8px 12px;
                background:#dc3545;
                color:white;
                border:none;
                border-radius:5px;
                cursor:pointer;
            ">🗑 Limpiar Lista</button>`;

    Swal.fire({
        title: "🎧 Tu Lista de Canciones",
        html,
        width: 600,
        showConfirmButton: false,
        showCloseButton: true,
        didOpen: () => {

            listaCanciones.forEach((c, i) => {
                const elemento = document.getElementById(`cancion-${i}`);
                if (elemento) elemento.addEventListener("click", () => reproducirPreview(c));
            });

            document.querySelectorAll(".btn-eliminar").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    const index = Number(e.currentTarget.dataset.index);
                    listaCanciones.splice(index, 1);
                    guardarLista();
                    mostrarListaCanciones();
                });
            });

            // El listener para el botón "Limpiar Lista" no cambia.
            const btnLimpiar = document.getElementById("btnLimpiarLista");
            if (btnLimpiar) {
                btnLimpiar.addEventListener("click", () => {
                    Swal.fire({
                        title: "¿Estás seguro?",
                        text: "Se eliminará toda tu lista de canciones",
                        icon: "warning",
                        showCancelButton: true,
                        confirmButtonText: "Sí, limpiar",
                        cancelButtonText: "Cancelar",
                    }).then(result => {
                        if (result.isConfirmed) {
                            listaCanciones = [];
                            guardarLista();
                            Swal.fire({ icon: "success", title: "Lista vaciada", timer: 1500, showConfirmButton: false });
                        }
                    });
                });
            }
        },
    });
}
async function sugerenciaMusical() {
    try {
        const { value: genero } = await Swal.fire({
            title: "🎵 Elegí un género musical",
            input: "select",
            inputOptions: {
                rock: "Rock ",
                pop: "Pop ",
                jazz: "Jazz ",
                hiphop: "Hip-Hop ",
                classical: "Clásica ",
                metal: "Metal ",
                reggae: "Reggae ",
            },
            inputPlaceholder: "Selecciona un género",
            showCancelButton: true,
            confirmButtonText: "Buscar 🎶",
            cancelButtonText: "Cancelar",
        });

        if (!genero) return;

        const respuesta = await fetch(`https://itunes.apple.com/search?term=${genero}&entity=song&limit=25`);
        if (!respuesta.ok) throw new Error("Error al obtener sugerencias");

        const data = await respuesta.json();
        if (!data.results || data.results.length === 0) {
            Swal.fire({ icon: "info", title: "No se encontraron sugerencias" });
            return;
        }

        const cancion = data.results[Math.floor(Math.random() * data.results.length)];
        const audioPreview = cancion.previewUrl;
        let audioHTML = audioPreview
            ? `<audio id="player" controls autoplay style="margin-top: 1rem; width: 100%;">
                   <source src="${audioPreview}" type="audio/mpeg">
               </audio>
               <p style="font-size: 0.9rem; color: gray;">🎧 Reproduciendo una preview de 30 segundos</p>`
            : `<p style="color: #999;">⚠️ Esta canción no tiene preview disponible.</p>`;

        Swal.fire({
            title: `🎧 Sugerencia (${genero.toUpperCase()})`,
            html: `
                <strong>${cancion.trackName}</strong><br>
                de <em>${cancion.artistName}</em><br>
                <img src="${cancion.artworkUrl100}" width="200" style="margin-top: 1rem; border-radius:10px;">
                ${audioHTML}
            `,
            showCancelButton: true,
            confirmButtonText: "✅ Agregar a mi lista",
            cancelButtonText: "Cerrar",
            background: document.body.classList.contains("dark") ? "#222" : "#fff",
            color: document.body.classList.contains("dark") ? "#fff" : "#000",
            width: 400
        }).then((result) => {
            if (result.isConfirmed) {
                listaCanciones.push({
                    titulo: cancion.trackName,
                    artista: cancion.artistName,
                    duracion: "00:30",
                    preview: cancion.previewUrl || null
                });
                guardarLista();
                Swal.fire({
                    icon: "success",
                    title: "🎵 Canción agregada",
                    text: `${cancion.trackName} - ${cancion.artistName}`,
                    timer: 2000,
                    showConfirmButton: false,
                });
            }
        });

        setTimeout(() => {
            const player = document.getElementById("player");
            if (player) player.pause();
        }, 15000);

    } catch (error) {
        Swal.fire({ icon: "error", title: "Error", text: error.message });
    }
}

function reproducirPreview(cancion) {
    if (!cancion.preview) {
        Swal.fire({
            icon: "info",
            title: "⚠️ No hay preview disponible",
            text: `${cancion.titulo} - ${cancion.artista}`,
        });
        return;
    }

    Swal.fire({
        title: `🎵 Escuchando: ${cancion.titulo}`,
        html: `
            <em>${cancion.artista}</em><br>
            <audio id="player" controls autoplay style="margin-top: 1rem; width: 100%;">
                <source src="${cancion.preview}" type="audio/mpeg">
            </audio>
            <p style="font-size: 0.9rem; color: gray;">🎧 Reproduciendo 15 segundos...</p>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        width: 400,
    });

    setTimeout(() => {
        const player = document.getElementById("player");
        if (player) player.pause();
    }, 15000);
}

function configurarLiveSearch() {
    const resultados = document.createElement("div");
    resultados.id = "resultadosLive";
    resultados.style.cssText = `
        max-width: 400px;
        margin: 0 auto 20px auto;
        background: #fff;
        border-radius: 5px;
        border: 1px solid #ccc;
        padding: 8px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        max-height: 250px;
        overflow-y: auto;
    `;
    document.querySelector(".formulario").insertAdjacentElement("afterend", resultados);

    const spinner = document.createElement("div");
    spinner.id = "spinner";
    spinner.style.cssText = `
        display:none;
        text-align:center;
        padding:10px;
    `;
    spinner.innerHTML = `
        <div class="loader" style="
            border: 5px solid #f3f3f3;
            border-top: 5px solid #1db954;
            border-radius: 50%;
            width: 35px;
            height: 35px;
            animation: spin 1s linear infinite;
            margin: auto;
        "></div>
        <p style="font-size:14px;color:#555;">Buscando canciones...</p>
    `;
    resultados.before(spinner);

    let timeout;
    async function buscar() {
        const titulo = inputTitulo.value.trim();
        const artista = inputArtista.value.trim();
        resultados.innerHTML = "";

        if (!titulo && !artista) {
            resultados.innerHTML = "<p style= 'color:#999; text-align:center;' >Empieza a escribir para buscar...</p>";
            return;
        }

        clearTimeout(timeout);
        timeout = setTimeout(async () => {
            spinner.style.display = "block";
            try {
                const query = [titulo, artista].filter(Boolean).join(" ");
                const respuesta = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=10`);
                if (!respuesta.ok) throw new Error("Error al obtener datos");
                const data = await respuesta.json();

                spinner.style.display = "none";
                if (!data.results || data.results.length === 0) {
                    resultados.innerHTML = "<p style='color:#999; text-align:center;'>No se encontraron coincidencias</p>";
                    return;
                }

                resultados.innerHTML = data.results.map(c => `
                    <div class="resultado-item" style="
                        display:flex;
                        align-items:center;
                        justify-content:space-between;
                        border-bottom:1px solid #eee;
                        padding:6px;
                        cursor:pointer;
                        transition:background 0.2s;
                    ">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${c.artworkUrl60}" alt="" style="width:45px; height:45px; border-radius:5px;">
                            <div>
                                <strong>${c.trackName}</strong><br>
                                <span style="font-size:0.9rem; color:#666;">${c.artistName}</span>
                            </div>
                        </div>
                        <button class="btn-agregar" style="
                            background:#1db954;
                            color:white;
                            border:none;
                            border-radius:5px;
                            padding:4px 8px;
                            cursor:pointer;
                            font-size:13px;
                        ">+ Agregar</button>
                    </div>
                `).join("");

                resultados.querySelectorAll(".resultado-item").forEach((item, i) => {
                    const cancion = data.results[i];

                    item.addEventListener("mouseenter", () => item.style.background = "#f0f0f0");
                    item.addEventListener("mouseleave", () => item.style.background = "#fff");

                    item.addEventListener("click", (e) => {
                        if (e.target.classList.contains("btn-agregar")) return;
                        if (!cancion.previewUrl) {
                            Swal.fire({ icon: "info", title: "⚠️ No hay preview disponible" });
                            return;
                        }

                        Swal.fire({
                            title: `🎵 ${cancion.trackName}`,
                            html: `
                                <em>${cancion.artistName}</em><br>
                                <img src="${cancion.artworkUrl100}" width="200" style="margin-top:1rem; border-radius:10px;"><br>
                                <audio id="player" controls autoplay style="margin-top:1rem; width:100%;">
                                    <source src="${cancion.previewUrl}" type="audio/mpeg">
                                </audio>
                                <p style="font-size:0.9rem; color:gray;"></p>
                            `,
                            showConfirmButton: false,
                            showCloseButton: true,
                            width: 400,
                            background: document.body.classList.contains("dark") ? "#222" : "#fff",
                            color: document.body.classList.contains("dark") ? "#fff" : "#000",
                        });

                        setTimeout(() => {
                            const player = document.getElementById("player");
                            if (player) player.pause();
                        }, 15000);
                    });

                    item.querySelector(".btn-agregar").addEventListener("click", (e) => {
                        e.stopPropagation();
                        const nuevaCancion = {
                            titulo: cancion.trackName,
                            artista: cancion.artistName,
                            preview: cancion.previewUrl,
                            duracion: "00:30"
                        };
                        listaCanciones.push(nuevaCancion);
                        guardarLista();
                        mostrarMensaje(`🎶 "${cancion.trackName}" agregada a tu lista`);
                    });
                });
            } catch (error) {
                spinner.style.display = "none";
                resultados.innerHTML = `<p style='color:red; text-align:center;'>Error: ${error.message}</p>`;
            }
        }, 400);
    }
    const buscarDebounced = debounce(buscar, 100);

    inputTitulo.addEventListener("input", buscarDebounced);
    inputArtista.addEventListener("input", buscarDebounced);
}

if (localStorage.getItem('modoOscuro') === 'true') {
    document.body.classList.add('dark');
    btnDarkMode.textContent = "☀️ Modo Claro";
}
btnDarkMode.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const esDark = document.body.classList.contains("dark");
    btnDarkMode.textContent = esDark ? "☀️ Modo Claro" : "🌙 Modo Oscuro";
    localStorage.setItem('modoOscuro', esDark);
});

document.getElementById("btnMostrar").addEventListener("click", mostrarListaCanciones);
document.getElementById("btnSugerencia").addEventListener("click", sugerenciaMusical);
document.querySelectorAll(".formulario input").forEach(i => i.addEventListener("input", guardarFormulario));
configurarLiveSearch();
