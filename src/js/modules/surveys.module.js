import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, increment,
serverTimestamp, query, orderBy, where } from '../config/firebase.config.js';
import { getDbInstance } from '../config/firebase.config.js';
import authManager from '../core/auth.manager.js';
import toastManager from '../core/toast.manager.js';
import modalManager from '../core/modal.manager.js';
import { formatDate, truncate, generateId, getElement } from '../core/utils.js';

class SurveysModule {
    constructor() {
        this.surveys = [];
        this.isLoaded = false;
        this.currentUser = null;
        this.currentSurvey = null;

        this.categories = {
            estudio: { name: 'Métodos de Estudio', icon: '📚' },
            materias: { name: 'Evaluación de Materias', icon: '📖' },
            tecnologia: { name: 'Tecnología Educativa', icon: '💻' },
            general: { name: 'Opinión General', icon: '🌟' }
        };
    }

    // inicializa el módulo
    init() {
        this.currentUser = authManager.getCurrentUser();
        this.setupEventListeners();

        authManager.onAuthStateChanged((user) => {
            this.onAuthChanged(user);
        });
    }

    // carga las encuestas
    async load(updateUI = true, silent = false) {
        try {
            if (!this.isLoaded && updateUI) {
                this.showLoading();
            }

            await this.loadSurveys();

            if (updateUI) {
                this.render();
                this.hideLoading();
            }

            this.isLoaded = true;
        } catch (error) {
            if (!silent) {
                toastManager.error('Error al cargar encuestas');
                this.handleError('load', error);
            }

            if (updateUI) {
                this.showError();
                this.hideLoading();
            }
        } finally {
            // Emitir evento SIEMPRE, incluso si hay error (para actualizar stats con datos disponibles)
            this.emit('surveys:loaded', { surveys: this.surveys });
        }

        return this.surveys;
    }

    // carga encuestas desde Firestore
    async loadSurveys() {
        const db = getDbInstance();
        if (!db) throw new Error('Database not initialized');
        try {
            let snapshot;
            try {
                const q = query(collection(db, 'encuestas'), orderBy('timestamp', 'desc'));
                snapshot = await getDocs(q);
            } catch {
                snapshot = await getDocs(collection(db, 'encuestas'));
            }
            const surveys = [];
            snapshot.forEach(docSnap => {
                surveys.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });
            // ordenar por fecha
            surveys.sort((a, b) => {
                const dateA = this.getSurveyDate(a);
                const dateB = this.getSurveyDate(b);
                return dateB - dateA;
            });
            this.surveys = surveys;
            return surveys;
        } catch (error) {
            throw new Error(`Failed to load surveys: ${error.message}`);
        }
    }

    getSurveyDate(survey) {
        if (!survey.timestamp) return new Date(0);
        try {
            if (survey.timestamp.toDate) {
                return survey.timestamp.toDate();
            }
            return new Date(survey.timestamp);
        } catch {
            return new Date(0);
        }
    }

    // renderiza la lista de encuestas
    render() {
        const container = getElement('#surveysList');
        if (!container) return;
        container.innerHTML = '';
        if (this.surveys.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>No hay encuestas</h3>
                    <p>¡Sé el primero en crear una!</p>
                    <button class="btn-primary" id="emptyCreateSurvey">
                        <span class="btn-icon">➕</span>
                        <span class="btn-text">Crear Primera Encuesta</span>
                    </button>
                </div>
            `;
            // event listener para botón vacío
            const emptyBtn = container.querySelector('#emptyCreateSurvey');
            if (emptyBtn) {
                emptyBtn.addEventListener('click', () => this.openSurveyModal());
            }
            return;
        }
        // renderizar cada encuesta
        this.surveys.forEach(survey => {
            const card = this.createSurveyCard(survey);
            container.appendChild(card);
        });
    }

    createSurveyCard(survey) {
        const card = document.createElement('div');
        card.className = 'survey-card';
        card.setAttribute('data-survey-id', survey.id);
        const isMine = this.currentUser && survey.autorId === this.currentUser.uid;
        const header = document.createElement('div');
        header.className = 'survey-header';
        const categoryConfig = this.categories[survey.categoria] || { name: 'General', icon: '📋' };
        header.innerHTML = `
            <span class="survey-category">
                <span class="survey-category-icon">${categoryConfig.icon}</span>
                ${categoryConfig.name}
            </span>
        `;
        // botón eliminar si es mío
        if (isMine) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete-survey';
            deleteBtn.title = 'Eliminar encuesta';
            deleteBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            deleteBtn.addEventListener('click', () => this.confirmDelete(survey));
            header.appendChild(deleteBtn);
        }
        card.appendChild(header);
        // título
        const title = document.createElement('h3');
        title.className = 'survey-title';
        title.textContent = survey.titulo || 'Sin título';
        card.appendChild(title);
        // descripción
        if (survey.descripcion) {
            const desc = document.createElement('p');
            desc.className = 'survey-description';
            desc.textContent = truncate(survey.descripcion, 100);
            card.appendChild(desc);
        }
        // meta
        const meta = document.createElement('div');
        meta.className = 'survey-meta';
        meta.innerHTML = `
            <div class="survey-author">
                <span class="meta-icon">👤</span>
                Por ${survey.autorNombre || 'Anónimo'}
                <span class="meta-separator">•</span>
                <span class="meta-icon">🕐</span>
                ${formatDate(survey.timestamp)}
            </div>
            <div class="survey-stats">
                <span class="survey-stat">
                    <span class="stat-icon">📝</span>
                    ${survey.preguntas?.length || 0} preguntas
                </span>
                <span class="survey-stat">
                    <span class="stat-icon">👥</span>
                    ${survey.respuestas || 0} respuestas
                </span>
            </div>
        `;
        card.appendChild(meta);

        // acciones
        const actions = document.createElement('div');
        actions.className = 'survey-actions';

        const participateBtn = document.createElement('button');
        participateBtn.className = 'btn-participate';
        participateBtn.innerHTML = `
            <span class="btn-icon">📝</span>
            <span class="btn-text">Participar</span>
        `;
        participateBtn.addEventListener('click', () => this.participate(survey.id));

        actions.appendChild(participateBtn);
        card.appendChild(actions);

        return card;
    }

    // configura event listeners
    setupEventListeners() {
        // botón "Nueva Encuesta"
        const addBtn = getElement('#addSurveyBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openSurveyModal());
        }

        // formulario
        const form = getElement('#surveyForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // botones cerrar modal
        ['closeSurveyModal', 'cancelSurvey'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.closeSurveyModal());
            }
        });

        // botón agregar pregunta
        const addQuestionBtn = getElement('#addQuestionBtn');
        if (addQuestionBtn) {
            addQuestionBtn.addEventListener('click', () => this.addQuestion());
        }

        // botón volver de participación
        const backBtn = getElement('#backToSurveysBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.backToSurveys());
        }

        // botón cancelar participación
        const cancelBtn = getElement('#cancelParticipation');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.backToSurveys());
        }
    }

    // abre el modal de crear encuesta
    openSurveyModal() {
        if (!this.currentUser) {
            toastManager.warning('Debes iniciar sesión para crear encuestas');
            return;
        }

        modalManager.open('surveyModal');

        // limpiar y agregar primera pregunta
        this.clearQuestions();
        this.addQuestion();

        setTimeout(() => {
            const titleInput = getElement('#surveyTitle');
            if (titleInput) titleInput.focus();
        }, 100);
    }

    // cierra el modal de encuesta
    closeSurveyModal() {
        modalManager.close('surveyModal');

        const form = getElement('#surveyForm');
        if (form) form.reset();

        this.clearQuestions();
    }

    // limpia todas las preguntas
    clearQuestions() {
        const container = getElement('#questionsList');
        if (container) container.innerHTML = '';
    }

    // agrega una nueva pregunta
    addQuestion() {
        const container = getElement('#questionsList');
        if (!container) return;

        const questionCount = container.children.length + 1;
        const questionId = generateId();

        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        questionDiv.setAttribute('data-question-id', questionId);

        questionDiv.innerHTML = `
            <div class="question-header">
                <span class="question-number">Pregunta ${questionCount}</span>
                <button type="button" class="btn-remove-question" title="Eliminar pregunta">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>

            <div class="form-group">
                <label class="form-label">Texto de la pregunta *</label>
                <input type="text" class="question-text form-input" placeholder="Escribe tu pregunta aquí" required>
            </div>

            <div class="form-group">
                <label class="form-label">Tipo de pregunta</label>
                <select class="question-type form-select">
                    <option value="multiple">Opción múltiple</option>
                    <option value="text">Respuesta abierta</option>
                    <option value="rating">Calificación (1-5)</option>
                </select>
            </div>

            <div class="question-options" data-options-container="${questionId}">
                ${this.renderMultipleOptions()}
            </div>
        `;

        container.appendChild(questionDiv);

        // event listeners
        const removeBtn = questionDiv.querySelector('.btn-remove-question');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                questionDiv.remove();
                this.updateQuestionNumbers();
            });
        }

        const typeSelect = questionDiv.querySelector('.question-type');
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                this.changeQuestionType(questionId, e.target.value);
            });
        }

        // event listener para agregar opciones
        const addOptionBtn = questionDiv.querySelector('.btn-add-option');
        if (addOptionBtn) {
            addOptionBtn.addEventListener('click', () => {
                this.addOption(questionId);
            });
        }

        // event listeners para remover opciones
        questionDiv.querySelectorAll('.btn-remove-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.removeOption(e.target.closest('.question-option'));
            });
        });
    }

    // renderiza opciones múltiples
    renderMultipleOptions() {
        return `
            <div class="options-list">
                <div class="question-option">
                    <span class="option-letter">A</span>
                    <input type="text" class="option-text form-input" placeholder="Opción A">
                    <button type="button" class="btn-remove-option" title="Eliminar">×</button>
                </div>
                <div class="question-option">
                    <span class="option-letter">B</span>
                    <input type="text" class="option-text form-input" placeholder="Opción B">
                    <button type="button" class="btn-remove-option" title="Eliminar">×</button>
                </div>
            </div>
            <button type="button" class="btn-add-option btn-secondary">
                <span>➕ Agregar opción</span>
            </button>
        `;
    }

    // cambia el tipo de pregunta
    changeQuestionType(questionId, type) {
        const container = document.querySelector(`[data-options-container="${questionId}"]`);
        if (!container) return;

        if (type === 'text') {
            container.innerHTML = `
                <div class="text-response-info">
                    <p>Los participantes podrán escribir una respuesta libre</p>
                </div>
            `;
        } else if (type === 'rating') {
            container.innerHTML = `
                <div class="rating-info">
                    <p>Los participantes calificarán del 1 al 5</p>
                    <div class="rating-preview">⭐ ⭐ ⭐ ⭐ ⭐</div>
                </div>
            `;
        } else {
            container.innerHTML = this.renderMultipleOptions();

            // reconfigurar event listeners
            const addOptionBtn = container.querySelector('.btn-add-option');
            if (addOptionBtn) {
                addOptionBtn.addEventListener('click', () => this.addOption(questionId));
            }

            container.querySelectorAll('.btn-remove-option').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.removeOption(e.target.closest('.question-option'));
                });
            });
        }
    }

    // agrega una opción a una pregunta
    addOption(questionId) {
        const container = document.querySelector(`[data-options-container="${questionId}"] .options-list`);
        if (!container) return;

        const optionCount = container.children.length;
        const letter = String.fromCharCode(65 + optionCount); // A, B, C... 

        const optionDiv = document.createElement('div');
        optionDiv.className = 'question-option';
        optionDiv.innerHTML = `
            <span class="option-letter">${letter}</span>
            <input type="text" class="option-text form-input" placeholder="Opción ${letter}">
            <button type="button" class="btn-remove-option" title="Eliminar">×</button>
        `;

        container.appendChild(optionDiv);

        // event listener para remover
        const removeBtn = optionDiv.querySelector('.btn-remove-option');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.removeOption(optionDiv);
            });
        }

        // focus en el input
        const input = optionDiv.querySelector('.option-text');
        if (input) input.focus();
    }

    // remueve una opción
    removeOption(optionDiv) {
        const container = optionDiv.parentElement;
        if (container.children.length <= 2) {
            toastManager.warning('Debe haber al menos 2 opciones');
            return;
        }

        optionDiv.remove();
        this.updateOptionLetters(container);
    }

    // actualiza las letras de las opciones
    updateOptionLetters(container) {
        const options = container.querySelectorAll('.question-option');
        options.forEach((option, index) => {
            const letter = String.fromCharCode(65 + index);
            const letterSpan = option.querySelector('.option-letter');
            const input = option.querySelector('.option-text');

            if (letterSpan) letterSpan.textContent = letter;
            if (input) input.placeholder = `Opción ${letter}`;
        });
    }

    // actualiza los números de las preguntas
    updateQuestionNumbers() {
        const container = getElement('#questionsList');
        if (!container) return;

        const questions = container.querySelectorAll('.question-item');
        questions.forEach((question, index) => {
            const numberSpan = question.querySelector('.question-number');
            if (numberSpan) numberSpan.textContent = `Pregunta ${index + 1}`;
        });
    }

    // maneja el envío del formulario
    async handleFormSubmit(e) {
        e.preventDefault();

        if (!this.currentUser) {
            toastManager.error('Debes iniciar sesión');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn?.innerHTML;

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span>Guardando...</span>';
            }

            // obtener datos
            const titulo = getElement('#surveyTitle')?.value.trim() || '';
            const descripcion = getElement('#surveyDescription')?.value.trim() || '';
            const categoria = getElement('#surveyCategory')?.value || '';

            // validar
            if (!titulo) {
                toastManager.warning('El título es obligatorio');
                return;
            }

            if (!categoria) {
                toastManager.warning('Selecciona una categoría');
                return;
            }

            // recopilar preguntas
            const preguntas = this.collectQuestions();

            if (preguntas.length === 0) {
                toastManager.warning('Agrega al menos una pregunta');
                return;
            }

            // guardar encuesta
            await this.saveSurvey({
                titulo,
                descripcion,
                categoria,
                preguntas
            });

            this.closeSurveyModal();
            await this.load();

            toastManager.success('¡Encuesta creada exitosamente!');
        } catch (error) {
            this.handleError('save', error);
            toastManager.error('Error al crear encuesta');
        } finally {
            if (submitBtn && originalText) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    // recopila las preguntas del formulario
    collectQuestions() {
        const questions = [];
        const questionItems = document.querySelectorAll('.question-item');

        questionItems.forEach((item, index) => {
            const texto = item.querySelector('.question-text')?.value.trim();
            const tipo = item.querySelector('.question-type')?.value;

            if (!texto) return;

            const question = {
                id: item.getAttribute('data-question-id'),
                numero: index + 1,
                texto,
                tipo,
                opciones: []
            };

            // recopilar opciones si es múltiple
            if (tipo === 'multiple') {
                const optionInputs = item.querySelectorAll('.option-text');
                optionInputs.forEach(input => {
                    const value = input.value.trim();
                    if (value) question.opciones.push(value);
                });
            } else if (tipo === 'rating') {
                question.opciones = ['1', '2', '3', '4', '5'];
            }

            questions.push(question);
        });

        return questions;
    }

    // guarda una encuesta en Firestore
    async saveSurvey(data) {
        const db = getDbInstance();
        if (!db) throw new Error('Database not initialized');

        const surveyData = {
            ...data,
            timestamp: serverTimestamp(),
            autorId: this.currentUser.uid,
            autorNombre: this.currentUser.displayName || 'Usuario',
            autorEmail: this.currentUser.email,
            respuestas: 0
        };

        await addDoc(collection(db, 'encuestas'), surveyData);
    }

    // participa en una encuesta
    async participate(surveyId) {
        if (!this.currentUser) {
            toastManager.warning('Debes iniciar sesión para participar');
            return;
        }

        const survey = this.surveys.find(s => s.id === surveyId);
        if (!survey) {
            toastManager.error('Encuesta no encontrada');
            return;
        }

        // verificar si ya participó
        const hasParticipated = await this.checkParticipation(surveyId);

        // cambiar a sección de participación
        this.showParticipationSection(survey, hasParticipated);
    }

    // verifica si el usuario ya participó
    async checkParticipation(surveyId) {
        const db = getDbInstance();
        if (!db || !this.currentUser) return false;

        try {
            const q = query(
                collection(db, 'respuestas_encuestas'),
                where('encuestaId', '==', surveyId),
                where('participanteId', '==', this.currentUser.uid)
            );

            const snapshot = await getDocs(q);
            return !snapshot.empty;
        } catch {
            return false;
        }
    }

    // muestra la sección de participación
    showParticipationSection(survey, hasParticipated) {
        // ocultar todas las secciones
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

        // mostrar sección de participación
        const section = getElement('#surveyParticipationSection');
        if (section) section.classList.add('active');

        // actualizar información
        const titleEl = getElement('#surveyParticipationTitle');
        const descEl = getElement('#surveyParticipationDesc');

        if (titleEl) titleEl.textContent = survey.titulo;
        if (descEl) descEl.textContent = hasParticipated ? 'Resultados de la encuesta' : 'Responde las preguntas';

        // actualizar info card
        const infoTitle = getElement('#surveyInfoTitle');
        const infoDesc = getElement('#surveyInfoDescription');
        const infoAuthor = getElement('#surveyInfoAuthor');
        const infoQuestions = getElement('#surveyInfoQuestions');

        if (infoTitle) infoTitle.textContent = survey.titulo;
        if (infoDesc) infoDesc.textContent = survey.descripcion || 'Sin descripción';
        if (infoAuthor) infoAuthor.textContent = `Por: ${survey.autorNombre || 'Anónimo'}`;
        if (infoQuestions) infoQuestions.textContent = `Preguntas: ${survey.preguntas?.length || 0}`;

        if (hasParticipated) {
            this.showResults(survey);
        } else {
            this.showParticipationForm(survey);
        }
    }

    // muestra el formulario de participación
    showParticipationForm(survey) {
        const container = getElement('#surveyQuestionsContainer');
        if (!container) return;

        container.innerHTML = '';

        survey.preguntas.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'survey-question-card';
            questionDiv.setAttribute('data-question-id', question.id);

            let optionsHTML = '';

            if (question.tipo === 'multiple') {
                optionsHTML = question.opciones.map(option => `
                    <label class="survey-option">
                        <input type="radio" name="question-${question.id}" value="${option}" required>
                        <span class="option-text">${option}</span>
                    </label>
                `).join('');
            } else if (question.tipo === 'text') {
                optionsHTML = `
                    <textarea name="question-${question.id}" class="survey-text-input" placeholder="Escribe tu respuesta..." rows="3" required></textarea>
                `;
            } else if (question.tipo === 'rating') {
                optionsHTML = `
                    <div class="rating-options">
                        ${[1, 2, 3, 4, 5].map(num => `
                            <label class="rating-option">
                                <input type="radio" name="question-${question.id}" value="${num}" required>
                                <span class="rating-star">⭐</span>
                                <span class="rating-number">${num}</span>
                            </label>
                        `).join('')}
                    </div>
                `;
            }

            questionDiv.innerHTML = `
                <div class="question-header">
                    <span class="question-number">${index + 1}</span>
                    <h4 class="question-text">${question.texto}</h4>
                </div>
                <div class="question-options">
                    ${optionsHTML}
                </div>
            `;

            container.appendChild(questionDiv);
        });

        // configurar formulario
        const form = getElement('#surveyParticipationForm');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.submitParticipation(survey);
            };

            // mostrar botón submit
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.style.display = '';
                submitBtn.disabled = false;
            }
        }
    }

    // envía la participación
    async submitParticipation(survey) {
        const db = getDbInstance();
        if (!db || !this.currentUser) return;

        try {
            // recopilar respuestas
            const respuestas = {};
            let allAnswered = true;

            survey.preguntas.forEach(question => {
                if (question.tipo === 'multiple' || question.tipo === 'rating') {
                    const checked = document.querySelector(`[name="question-${question.id}"]:checked`);
                    if (checked) {
                        respuestas[question.id] = checked.value;
                    } else {
                        allAnswered = false;
                    }
                } else if (question.tipo === 'text') {
                    const textarea = document.querySelector(`[name="question-${question.id}"]`);
                    if (textarea && textarea.value.trim()) {
                        respuestas[question.id] = textarea.value.trim();
                    } else {
                        allAnswered = false;
                    }
                }
            });

            if (!allAnswered) {
                toastManager.warning('Por favor responde todas las preguntas');
                return;
            }

            toastManager.info('Enviando respuestas...');

            // guardar respuesta
            const responseData = {
                encuestaId: survey.id,
                encuestaTitulo: survey.titulo,
                respuestas,
                timestamp: serverTimestamp(),
                participanteId: this.currentUser.uid,
                participanteNombre: this.currentUser.displayName,
                participanteEmail: this.currentUser.email
            };

            await addDoc(collection(db, 'respuestas_encuestas'), responseData);

            // incrementar contador
            await updateDoc(doc(db, 'encuestas', survey.id), {
                respuestas: increment(1)
            });

            toastManager.success('¡Respuesta enviada exitosamente!');

            // mostrar resultados
            setTimeout(() => {
                this.participate(survey.id);
            }, 1000);
        } catch (error) {
            this.handleError('submit-participation', error);
            toastManager.error('Error al enviar respuesta');
        }
    }

    // muestra los resultados de la encuesta
    async showResults(survey) {
        const db = getDbInstance();
        if (!db) return;

        // cargar todas las respuestas
        const q = query(
            collection(db, 'respuestas_encuestas'),
            where('encuestaId', '==', survey.id)
        );

        const snapshot = await getDocs(q);
        const allResponses = [];
        snapshot.forEach(docSnap => {
            allResponses.push(docSnap.data());
        });

        const container = getElement('#surveyQuestionsContainer');
        if (!container) return;

        container.innerHTML = '';

        // calcular resultados por pregunta
        survey.preguntas.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'survey-question-card results';

            questionDiv.innerHTML = `
                <div class="question-header">
                    <span class="question-number">${index + 1}</span>
                    <h4 class="question-text">${question.texto}</h4>
                </div>
            `;

            const resultsDiv = document.createElement('div');
            resultsDiv.className = 'survey-results';

            if (question.tipo === 'multiple' || question.tipo === 'rating') {
                const counts = {};
                let total = 0;

                // contar respuestas
                allResponses.forEach(response => {
                    const answer = response.respuestas?.[question.id];
                    if (answer) {
                        counts[answer] = (counts[answer] || 0) + 1;
                        total++;
                    }
                });

                // renderizar barras
                const options = question.tipo === 'rating' ? ['1', '2', '3', '4', '5'] : question.opciones;
                options.forEach(option => {
                    const count = counts[option] || 0;
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

                    const barDiv = document.createElement('div');
                    barDiv.className = 'result-bar';
                    barDiv.innerHTML = `
                        <span class="result-label">${option}</span>
                        <div class="result-bar-container">
                            <div class="result-bar-fill" style="width: ${percentage}%"></div>
                            <span class="result-percentage">${percentage}%</span>
                        </div>
                        <span class="result-count">${count} votos</span>
                    `;

                    resultsDiv.appendChild(barDiv);
                });

                // si es rating, mostrar promedio
                if (question.tipo === 'rating' && total > 0) {
                    let sum = 0;
                    Object.entries(counts).forEach(([rating, count]) => {
                        sum += parseInt(rating) * count;
                    });
                    const average = (sum / total).toFixed(2);

                    const avgDiv = document.createElement('div');
                    avgDiv.className = 'result-average';
                    avgDiv.textContent = `Promedio: ${average} / 5`;
                    resultsDiv.appendChild(avgDiv);
                }
            } else if (question.tipo === 'text') {
                const responses = allResponses
                    .map(r => r.respuestas?.[question.id])
                    .filter(Boolean);

                if (responses.length > 0) {
                    responses.forEach(response => {
                        const responseDiv = document.createElement('div');
                        responseDiv.className = 'text-response';
                        responseDiv.textContent = response;
                        resultsDiv.appendChild(responseDiv);
                    });
                } else {
                    resultsDiv.innerHTML = '<p class="no-responses">Sin respuestas</p>';
                }
            }

            questionDiv.appendChild(resultsDiv);
            container.appendChild(questionDiv);
        });

        // ocultar botón de enviar
        const form = getElement('#surveyParticipationForm');
        if (form) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.style.display = 'none';
        }
    }

    // vuelve a la lista de encuestas
    backToSurveys() {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

        const section = getElement('#surveysSection');
        if (section) section.classList.add('active');

        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navItem = document.querySelector('[data-section="surveys"]');
        if (navItem) navItem.classList.add('active');
    }

    // confirma eliminación
    confirmDelete(survey) {
        modalManager.confirm(
            'Eliminar Encuesta',
            `¿Estás seguro de eliminar "${survey.titulo}"?`,
            () => this.deleteSurvey(survey.id),
            null
        );
    }

    // elimina una encuesta
    async deleteSurvey(surveyId) {
        const db = getDbInstance();
        if (!db) return;

        try {
            await deleteDoc(doc(db, 'encuestas', surveyId));
            toastManager.success('Encuesta eliminada');
            await this.load();
        } catch (error) {
            this.handleError('delete', error);
            toastManager.error('Error al eliminar encuesta');
        }
    }

    // maneja cambios de autenticación
    onAuthChanged(user) {
        this.currentUser = user;
        if (this.isLoaded) this.render();
    }

    // muestra loading
    showLoading() {
        const container = getElement('#surveysList');
        if (container) {
            container.innerHTML = '<div class="loading-placeholder">Cargando encuestas...</div>';
        }
    }

    // oculta loading
    hideLoading() {
        // el render limpia el loading
    }

    // muestra error
    showError() {
        const container = getElement('#surveysList');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Error al cargar encuestas</h3>
                    <p>Por favor, intenta de nuevo más tarde</p>
                </div>
            `;
        }
    }

    // maneja errores
    handleError(context, error) {
        this.emit('surveys:error', { context, error });
    }

    // emite eventos
    emit(eventName, detail = {}) {
        document.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    // limpia el módulo
    destroy() {
        this.surveys = [];
        this.isLoaded = false;
    }
}

export default SurveysModule;