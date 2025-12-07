# EstudiaFacil

Plataforma educativa colaborativa para compartir recursos, crear encuestas y fomentar la participacion academica.

## Descripcion

EstudiaFacil es una aplicacion web moderna que permite a estudiantes y educadores compartir recursos educativos, crear encuestas interactivas y participar en opiniones colaborativas. La plataforma esta construida con tecnologias web modernas y utiliza Firebase como backend.

## Caracteristicas

- **Recursos Educativos**: Subir y compartir documentos PDF, videos y enlaces educativos
- **Encuestas Interactivas**: Crear y responder cuestionarios con multiples tipos de preguntas
- **Opiniones Colaborativas**: Participar en discusiones tematicas con sistema de reacciones
- **Perfil de Usuario**: Gestion personalizada de contribuciones y estadisticas
- **Diseno Responsivo**: Optimizado para dispositivos moviles, tablets y escritorio
- **Modo Oscuro**: Tema oscuro moderno con efectos glassmorphism
- **Autenticacion Segura**: Inicio de sesion con Google mediante Firebase Auth

## Tecnologias

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Arquitectura modular con patron MVC
- CSS Variables para tematizacion
- Responsive Design con Media Queries

### Backend
- Firebase Authentication
- Cloud Firestore (base de datos NoSQL)
- Firebase Hosting

### Integracion
- Google OAuth 2.0
- Firebase SDK 10.7.1

## Estructura del Proyecto

```
estudiafacil/
├── index.html              # pagina principal
├── README.md              # documentacion
├── netlify.toml           # configuracion de despliegue
├── .gitignore             # archivos ignorados por git
└── src/
    ├── css/
    │   ├── main.css       # archivo principal de estilos
    │   ├── base/          # estilos base y variables
    │   ├── components/    # componentes reutilizables
    │   ├── layout/        # estructura y navegacion
    │   └── sections/      # estilos por seccion
    └── js/
        ├── app.js         # punto de entrada de la aplicacion
        ├── components/    # componentes UI
        ├── config/        # configuracion de Firebase
        ├── core/          # utilidades y managers
        └── modules/       # modulos funcionales
```

## Instalacion

### Requisitos Previos
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Cuenta de Firebase (para desarrollo)

### Configuracion

1. Clonar el repositorio:
```bash
git clone https://github.com/EiderMontalvo/estudiafacil.git
cd estudiafacil
```

2. Configurar Firebase:
   - Crear un proyecto en [Firebase Console](https://console.firebase.google.com)
   - Habilitar Authentication con Google
   - Crear una base de datos Firestore
   - Copiar las credenciales en `src/js/config/firebase.config.js`

3. Configurar reglas de Firestore:
   - Ir a Firestore Database > Rules
   - Configurar permisos de lectura y escritura segun necesidades

4. Agregar dominio a Firebase Authentication:
   - Ir a Authentication > Settings > Authorized domains
   - Agregar el dominio de produccion (ejemplo: tuapp.netlify.app)

5. Abrir `index.html` en un navegador o usar un servidor local:
```bash

## Despliegue

### Netlify
La aplicacion esta configurada para despliegue automatico en Netlify:

1. Conectar el repositorio a Netlify
2. Configuracion de build:
   - Build command: (ninguno)
   - Publish directory: `.`
3. El archivo `netlify.toml` contiene la configuracion de seguridad y headers

### Firebase Hosting
Alternativa de despliegue:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## Uso

### Para Usuarios

1. **Inicio de Sesion**:
   - Acceder a la plataforma
   - Hacer clic en "Comenzar Ahora"
   - Iniciar sesion con cuenta de Google

2. **Recursos**:
   - Ver recursos disponibles sin necesidad de login
   - Subir recursos (requiere autenticacion)
   - Filtrar por categoria, materia y nivel
   - Descargar archivos PDF

3. **Encuestas**:
   - Crear encuestas con preguntas personalizadas
   - Responder encuestas de otros usuarios
   - Ver estadisticas y resultados en tiempo real

4. **Opiniones**:
   - Publicar opiniones sobre temas academicos
   - Reaccionar a opiniones de otros usuarios
   - Filtrar por categoria

### Para Desarrolladores

#### Estructura de Modulos

Cada modulo sigue el patron:
```javascript
class ModuloNombre {
  constructor() { }
  init() { }           //inicializacion
  load() { }           //cargar datos
  render() { }         //renderizar UI
  destroy() { }        //limpieza
}
```

#### Managers Principales

- **AuthManager**: Gestion de autenticacion y sesiones
- **ToastManager**: Notificaciones y mensajes
- **ModalManager**: Ventanas modales y confirmaciones

#### Eventos Personalizados

```javascript
// emitir evento
document.dispatchEvent(new CustomEvent('evento:nombre', { 
  detail: { datos } 
}));

// escuchar evento
document.addEventListener('evento:nombre', (e) => {
  console.log(e.detail);
});
```

## Seguridad

- Autenticacion mediante Firebase Authentication
- Reglas de seguridad en Firestore
- Headers de seguridad configurados en Netlify
- Sanitizacion de inputs de usuario
- Validacion de datos en cliente

## Contribuir

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir un Pull Request

## Licencia

Este proyecto es de codigo abierto y esta disponible bajo la licencia MIT.

## Autor

- Eider Montalvo - Desarrollo inicial

---
