const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../client/src/i18n/locales');

// 西班牙语翻译映射
const translations = {
  "about": {
    "title": "Acerca de TopiVra",
    "intro": "TopiVra es una plataforma líder global de comercio de cuentas sociales, dedicada a proporcionar a los usuarios servicios de comercio de cuentas digitales seguros y convenientes. Reunimos vendedores de calidad de todo el mundo, ofreciendo una amplia variedad de recursos de cuentas de plataformas sociales.",
    "feature1": "Categorías completas, cubriendo plataformas principales",
    "feature2": "Entrega rápida, emisión automática de tarjetas",
    "feature3": "Servicio al cliente profesional, posventa sin preocupaciones",
    "feature4": "Garantía de primer inicio de sesión de 24 horas",
    "statsTitle": "Resumen de Datos",
    "accountsSold": "Cuentas Vendidas",
    "satisfiedCustomers": "Clientes Satisfechos",
    "customerSupport": "Soporte al Cliente",
    "featuresTitle": "Nuestras Características",
    "autoDelivery": "Entrega Automática 24H",
    "autoDeliveryDesc": "Procesamiento automático de pedidos, sin espera",
    "multiPlatform": "Cobertura Multi-Plataforma",
    "multiPlatformDesc": "TikTok, Instagram, Facebook y otras plataformas principales",
    "secureTransaction": "Transacción Segura Garantizada",
    "secureTransactionDesc": "Garantía de la plataforma, transacciones más seguras",
    "professionalSupport": "Equipo de Soporte Profesional",
    "professionalSupportDesc": "Servicio al cliente en línea 7x24 horas"
  },
  "contact": {
    "title": "Contáctanos",
    "subtitle": "Estamos aquí para ayudarte en cualquier momento",
    "telegramBot": "Soporte Telegram",
    "telegramBotDesc": "Bot de servicio al cliente en línea",
    "telegramChannel": "Canal Telegram",
    "telegramChannelDesc": "Anuncios y promociones",
    "emailSupport": "Soporte por Correo",
    "openChat": "Abrir Chat",
    "joinChannel": "Unirse al Canal",
    "sendEmail": "Enviar Correo",
    "messageForm": "Formulario de Mensaje",
    "name": "Nombre",
    "namePlaceholder": "Por favor ingresa tu nombre",
    "emailPlaceholder": "Por favor ingresa tu correo",
    "content": "Contenido",
    "contentPlaceholder": "Por favor ingresa tu mensaje",
    "contentRequired": "Por favor ingresa tu mensaje",
    "submitMessage": "Enviar Mensaje",
    "messageSuccess": "Mensaje enviado, ¡nos pondremos en contacto pronto!"
  },
  "footer": {
    "slogan": "Plataforma Global de Comercio de Cuentas de Redes Sociales",
    "telegram": "Canal de Telegram",
    "quickLinks": "Enlaces Rápidos",
    "home": "Inicio",
    "products": "Productos",
    "about": "Acerca de Nosotros",
    "tutorials": "Tutoriales",
    "support": "Soporte",
    "contact": "Contacto",
    "useTutorials": "Tutoriales",
    "applySeller": "Ser Vendedor",
    "terms": "Términos de Servicio",
    "privacy": "Política de Privacidad",
    "refund": "Política de Reembolso",
    "rights": "Todos los derechos reservados",
    "workingHours": "Horario de Soporte",
    "workingHoursVal": "09:00 – 22:00 (UTC+8)",
    "githubLink": "GitHub",
    "twitterLink": "Twitter / X",
    "workdayLabel": "Lun – Vie",
    "weekendLabel": "Sáb – Dom",
    "onlineLabel": "En línea",
    "offlineLabel": "Fuera de línea",
    "weekendNote": "Para casos urgentes, abre un ticket"
  },
  "notifications": {
    "title": "Notificaciones",
    "markAllRead": "Marcar Todas como Leídas",
    "refresh": "Actualizar",
    "loading": "Cargando...",
    "empty": "Sin notificaciones",
    "delete": "Eliminar",
    "viewAll": "Ver Todas",
    "types": {
      "order_status": "Estado del Pedido",
      "new_order": "Nuevo Pedido",
      "refund_request": "Solicitud de Reembolso",
      "refund_processed": "Reembolso Procesado",
      "ticket_reply": "Respuesta de Ticket",
      "system": "Notificación del Sistema",
      "withdrawal": "Retiro",
      "product_sold": "Producto Vendido",
      "price_drop": "Bajada de Precio"
    },
    "priority": {
      "low": "Baja",
      "medium": "Media",
      "high": "Alta"
    }
  },
  "mobile": {
    "me": "Yo"
  },
  "blog": {
    "title": "Tutoriales",
    "subtitle": "Tutoriales de inicio de sesión y uso de cuentas",
    "readMore": "Leer Más",
    "publishedAt": "Publicado el",
    "author": "Autor",
    "category": "Categoría",
    "tags": "Etiquetas",
    "allCategories": "Todas las Categorías",
    "searchPlaceholder": "Buscar artículos...",
    "noPosts": "Aún no hay artículos",
    "noPostsDesc": "Mantente atento a más contenido",
    "popularPosts": "Artículos Populares",
    "recentPosts": "Artículos Recientes",
    "relatedPosts": "Artículos Relacionados",
    "share": "Compartir",
    "like": "Me Gusta",
    "likes": "Me Gusta",
    "views": "Vistas",
    "comments": "Comentarios",
    "backToList": "Volver al Blog",
    "prevPost": "Anterior",
    "nextPost": "Siguiente",
    "categories": {
      "tutorial": "Tutoriales",
      "news": "Noticias",
      "guide": "Guía de Compras",
      "tips": "Consejos y Trucos"
    },
    "loadError": "Error al cargar artículo",
    "notFound": "Artículo no encontrado"
  },
  "notFound": {
    "message": "Lo sentimos, la página que buscas no existe"
  },
  "tools": {
    "title": "Herramientas Útiles",
    "subtitle": "Herramientas en línea gratuitas para ayudarte a gestionar tus cuentas de manera más eficiente",
    "infoTitle": "Información de Herramientas",
    "info1": "Todas las herramientas se ejecutan localmente en tu navegador",
    "info2": "No se sube ningún dato a ningún servidor",
    "info3": "Completamente gratis de usar",
    "info4": "Funciona en todos los dispositivos",
    "2fa": {
      "title": "Generador de Código 2FA",
      "subtitle": "Genera códigos de verificación TOTP de 6 dígitos localmente. Seguro y confiable.",
      "secretKey": "Clave Secreta",
      "secretPlaceholder": "Ingresa la clave secreta Base32",
      "accountName": "Nombre de Cuenta (Opcional)",
      "accountPlaceholder": "Ingresa el nombre de cuenta para referencia",
      "generate": "Generar Código",
      "copy": "Copiar",
      "copied": "Código copiado al portapapeles",
      "refreshIn": "Actualizar en",
      "errorEmpty": "Por favor ingresa una clave secreta",
      "errorInvalid": "Formato de clave secreta inválido",
      "infoTitle": "Cómo Usar",
      "info1": "Obtén la clave secreta de la configuración 2FA de tu cuenta",
      "info2": "Ingresa la clave secreta en el campo de arriba",
      "info3": "Haz clic en Generar para obtener un código de verificación de 6 dígitos",
      "info4": "Los códigos se actualizan automáticamente cada 30 segundos"
    },
    "cards": {
      "2fa": {
        "title": "Generador de Código 2FA",
        "desc": "Genera códigos de verificación TOTP localmente",
        "tag": "Seguridad"
      },
      "telegram": {
        "title": "Asistente de Código Telegram",
        "desc": "Obtén códigos de inicio de sesión de Telegram fácilmente",
        "tag": "Próximamente"
      },
      "check": {
        "title": "Verificador de Cuentas",
        "desc": "Verifica el estado y validez de la cuenta",
        "tag": "Próximamente"
      },
      "hotmail": {
        "title": "Herramienta Hotmail",
        "desc": "Herramientas de gestión de cuenta Hotmail",
        "tag": "Próximamente"
      }
    }
  },
  "terms": {
    "title": "Términos de Servicio",
    "section1Title": "1. Descripción del Servicio",
    "section1Content": "TopiVra es una plataforma de comercio de cuentas sociales que proporciona servicios de comercio para compradores y vendedores. Al usar esta plataforma, aceptas cumplir con los siguientes términos.",
    "section2Title": "2. Responsabilidades del Usuario",
    "section2Content": "Los usuarios deben asegurarse de que toda la información proporcionada sea verdadera y precisa. Está prohibido usar esta plataforma para cualquier actividad ilegal, incluyendo pero no limitado a fraude, lavado de dinero, etc.",
    "section3Title": "3. Reglas de Comercio",
    "section3Content": "Todas las transacciones se realizan a través del escrow de la plataforma. Después de que el comprador realice el pago, los fondos serán retenidos por la plataforma y liberados al vendedor después de la confirmación de recepción. Después de completar la transacción, el comprador tiene 24 horas para verificar la cuenta.",
    "section4Title": "4. Obligaciones del Vendedor",
    "section4Content": "Los vendedores deben asegurarse de que las cuentas vendidas sean genuinas y válidas, y proporcionar información de la cuenta según la descripción del producto. Si hay problemas con la cuenta, el vendedor debe asumir las responsabilidades correspondientes.",
    "section5Title": "5. Obligaciones del Comprador",
    "section5Content": "Los compradores deben completar la verificación dentro de las 24 horas posteriores a recibir la cuenta. No presentar objeciones después del plazo se considerará como finalización de la transacción.",
    "section6Title": "6. Resolución de Disputas",
    "section6Content": "En caso de disputas, ambas partes pueden negociar a través del servicio al cliente de la plataforma. La plataforma tiene el derecho de determinar el resultado de la disputa basándose en evidencias.",
    "section7Title": "7. Protección de Privacidad",
    "section7Content": "La plataforma protege estrictamente la privacidad del usuario y no divulgará información del usuario a terceros a menos que lo requiera la ley.",
    "section8Title": "8. Modificación de Términos",
    "section8Content": "La plataforma se reserva el derecho de modificar estos términos en cualquier momento. Los términos modificados se publicarán en el sitio web, y el uso continuo de la plataforma indica la aceptación de los términos modificados.",
    "lastUpdate": "Última Actualización: 28 de Febrero de 2026"
  },
  "privacy": {
    "title": "Política de Privacidad",
    "section1Title": "1. Recopilación de Información",
    "section1Content": "Recopilamos información personal que proporcionas al usar esta plataforma, incluyendo pero no limitado a: nombre de usuario, dirección de correo electrónico, información de contacto, registros de transacciones, etc. Esta información se utiliza para proporcionar y mejorar nuestros servicios.",
    "section2Title": "2. Uso de la Información",
    "section2Content": "Tu información personal solo se utiliza para: procesar pedidos, proporcionar soporte al cliente, enviar notificaciones importantes, mejorar las características de la plataforma. No usaremos tu información para otros fines.",
    "section3Title": "3. Protección de la Información",
    "section3Content": "Adoptamos medidas de seguridad estándar de la industria para proteger tu información, incluyendo cifrado de datos, control de acceso, auditorías de seguridad, etc. Terceros no autorizados no pueden acceder a tu información personal.",
    "section4Title": "4. Compartir Información",
    "section4Content": "No venderemos ni alquilaremos tu información personal a terceros. El intercambio solo puede ocurrir en las siguientes situaciones: con tu consentimiento, requisitos legales, protección de los derechos de la plataforma.",
    "section5Title": "5. Uso de Cookies",
    "section5Content": "Esta plataforma utiliza cookies para mejorar la experiencia del usuario y analizar el tráfico del sitio web. Puedes elegir desactivar las cookies en la configuración de tu navegador.",
    "section6Title": "6. Retención de Datos",
    "section6Content": "Conservaremos tu información personal durante el período necesario. Después de la cancelación de la cuenta, eliminaremos tu información personal dentro de un período razonable.",
    "section7Title": "7. Tus Derechos",
    "section7Content": "Tienes derecho a acceder, corregir y eliminar tu información personal. Si tienes alguna necesidad, por favor contacta a nuestro equipo de servicio al cliente.",
    "section8Title": "8. Actualizaciones de Política",
    "section8Content": "Podemos actualizar esta política de privacidad de vez en cuando. Los cambios significativos se te notificarán a través de anuncios en el sitio web.",
    "lastUpdate": "Última Actualización: 28 de Febrero de 2026"
  },
  "refund": {
    "title": "Política de Reembolso",
    "section1Title": "1. Condiciones de Reembolso",
    "section1Content": "Los compradores pueden solicitar un reembolso en las siguientes situaciones: no se puede iniciar sesión en la cuenta, la información de la cuenta es seriamente inconsistente con la descripción, la cuenta tiene riesgos de seguridad. Las solicitudes de reembolso deben presentarse dentro de las 24 horas posteriores a la recepción.",
    "section2Title": "2. Proceso de Reembolso",
    "section2Content": "1. El comprador envía la solicitud de reembolso en la página de detalles del pedido con el motivo.\\n2. El vendedor responde a la solicitud de reembolso dentro de 48 horas.\\n3. Si ambas partes no pueden llegar a un acuerdo, se puede solicitar la intervención de la plataforma.\\n4. Después de la aprobación de la plataforma, el reembolso se devolverá a la cuenta de pago original dentro de 1-3 días hábiles.",
    "section3Title": "3. Situaciones Sin Reembolso",
    "section3Content": "El reembolso no se admite en las siguientes situaciones:\\n- Exceder el período de verificación de 24 horas\\n- Cuenta bloqueada debido a operación inadecuada del comprador\\n- El comprador ha modificado la contraseña de la cuenta o información de vinculación\\n- Solicitud de reembolso falsa",
    "section4Title": "4. Monto del Reembolso",
    "section4Content": "El monto del reembolso es el monto de pago real del comprador. Si se usaron cupones, los cupones no se reembolsarán. Los reembolsos no incluyen tarifas de procesamiento.",
    "section5Title": "5. Resolución de Disputas",
    "section5Content": "Si hay una disputa entre comprador y vendedor sobre el reembolso, la plataforma tomará una determinación basada en la evidencia proporcionada por ambas partes. La determinación de la plataforma es final.",
    "section6Title": "6. Contacto de Servicio al Cliente",
    "section6Content": "Para preguntas relacionadas con reembolsos, por favor contacta al servicio al cliente: support@topivra.com o a través del servicio al cliente de Telegram.",
    "lastUpdate": "Última Actualización: 28 de Febrero de 2026"
  },
  "settings": {
    "adminTitle": "Configuración del Sistema",
    "site": "Configuración del Sitio",
    "transaction": "Configuración de Transacciones",
    "notification": "Configuración de Notificaciones",
    "siteName": "Nombre del Sitio",
    "siteLogo": "URL del Logo del Sitio",
    "siteAnnouncement": "Contenido del Anuncio",
    "commissionRate": "Tasa de Comisión",
    "minWithdraw": "Monto Mínimo de Retiro",
    "paymentTimeout": "Tiempo de Espera de Pago",
    "autoConfirmHours": "Horas de Confirmación Automática",
    "emailConfig": "Configuración de Correo",
    "smtpHost": "Host SMTP",
    "smtpPort": "Puerto SMTP",
    "smtpUser": "Usuario SMTP",
    "smtpPass": "Contraseña SMTP",
    "telegramBotToken": "Token del Bot de Telegram",
    "telegramChatId": "Chat ID de Telegram",
    "paymentConfig": "Configuración de Pago",
    "seoConfig": "Configuración de SEO",
    "telegramConfig": "Configuración de Telegram",
    "seoTitle": "Título del Sitio",
    "seoDescription": "Descripción del Sitio",
    "seoKeywords": "Palabras Clave",
    "socialLinks": "Enlaces de Redes Sociales",
    "socialGithub": "URL de GitHub",
    "socialTwitter": "URL de Twitter / X",
    "workingHours": "Horario de Trabajo del Soporte",
    "workingHoursDesc": "Ej: Lun–Vie 09:00–18:00 (UTC+8)"
  },
  "logs": {
    "title": "Logs del Sistema",
    "time": "Hora",
    "admin": "Operador",
    "action": {
      "userBan": "Bloquear Usuario",
      "userUnban": "Desbloquear Usuario",
      "sellerApprove": "Aprobar Vendedor",
      "sellerReject": "Rechazar Vendedor",
      "productDelete": "Eliminar Producto",
      "orderRefund": "Reembolsar Pedido",
      "settingsUpdate": "Actualizar Configuración",
      "login": "Login Admin",
      "logout": "Logout Admin"
    },
    "target": "Objetivo",
    "ip": "Dirección IP",
    "details": "Detalles",
    "total": "Total {{count}} registros"
  },
  "applySeller": {
    "title": "Solicitar ser Vendedor",
    "subtitle": "¿Tienes recursos de cuentas de calidad? Únete a nuestra comunidad de vendedores",
    "benefit1Title": "Alta Exposición",
    "benefit1Desc": "Soporte de tráfico de la plataforma",
    "benefit2Title": "Baja Comisión",
    "benefit2Desc": "Tarifas más bajas de la industria",
    "benefit3Title": "Liquidación Rápida",
    "benefit3Desc": "Pago rápido T+1",
    "formTitle": "Formulario de Solicitud",
    "shopName": "Nombre de la Tienda",
    "shopNamePlaceholder": "Ingresa el nombre de la tienda",
    "email": "Correo de Contacto",
    "emailPlaceholder": "Ingresa el correo",
    "telegram": "Telegram",
    "telegramPlaceholder": "Ingresa el nombre de usuario de Telegram",
    "platforms": "Plataformas de Negocio",
    "description": "Información Adicional",
    "descriptionPlaceholder": "Describe tu situación de suministro, volumen de envío diario, etc.",
    "submit": "Enviar Solicitud",
    "submitSuccess": "¡Solicitud enviada, la revisaremos pronto!"
  }
};

// 读取当前的 es-MX 文件
const esFile = path.join(localesDir, 'es-MX.json');
const esContent = JSON.parse(fs.readFileSync(esFile, 'utf-8'));

// 修复 notifications 键（它现在包含了 footer 的内容）
if (esContent.notifications && esContent.notifications.slogan) {
  // 将错误的 notifications 内容移到 footer
  esContent.footer = { ...esContent.notifications };
  // 重置 notifications
  esContent.notifications = translations.notifications;
}

// 添加缺失的顶层键
Object.keys(translations).forEach(key => {
  if (!esContent[key]) {
    esContent[key] = translations[key];
  }
});

// 保存修复后的文件
fs.writeFileSync(esFile, JSON.stringify(esContent, null, 2), 'utf-8');

console.log('✅ es-MX.json 已修复');








