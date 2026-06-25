import { workflow, node, trigger, sticky, ifElse, switchCase, merge, expr } from '@n8n/workflow-sdk';

// ───────────────────────────────────────── INGRESS ─────────────────────────────────────────

const telegramTrigger = trigger({
  type: 'n8n-nodes-base.telegramTrigger',
  version: 1.3,
  config: {
    name: 'Telegram Trigger',
    parameters: {
      updates: ['message'],
      additionalFields: {},
    },
    position: [0, 400],
  },
  output: [{ message: { chat: { id: 123456789, type: 'private' }, from: { id: 123456789, first_name: 'Juan' }, text: 'hola' } }],
});

const logIncomingEvent = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Log Incoming Event',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode: "const raw = JSON.stringify($json).slice(0, 2000);\nconsole.log('[INGRESS superlikers-tg]', raw);\nreturn $json;",
    },
    position: [220, 400],
  },
  output: [{ message: { chat: { id: 123456789 }, text: 'hola' } }],
});

const normalizeTelegramInput = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Normalize Telegram Input',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const m = $json.message || {};\n" +
        "const photos = Array.isArray(m.photo) ? m.photo : [];\n" +
        "const best = photos.length ? photos[photos.length - 1] : null;\n" +
        "return {\n" +
        "  chatId: m.chat ? String(m.chat.id) : '',\n" +
        "  text: m.text || m.caption || '',\n" +
        "  hasMedia: !!best,\n" +
        "  fileId: best ? best.file_id : '',\n" +
        "  mediaType: best ? 'image' : ''\n" +
        "};",
    },
    position: [440, 400],
  },
  output: [{ chatId: '123456789', text: 'hola', hasMedia: false, fileId: '', mediaType: '' }],
});

const getSession = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Get Session',
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: 'AsmN5sq4Pop0FVCi' },
      matchType: 'allConditions',
      filters: {
        conditions: [
          { keyName: 'chatId', condition: 'eq', keyValue: expr("{{ $('Normalize Telegram Input').item.json.chatId }}") },
        ],
      },
      returnAll: false,
      limit: 1,
    },
    position: [660, 400],
  },
  output: [{ chatId: '123456789', phone: '5215512345678', currentStep: 1, distinctId: '', name: '', email: '', photoActivityId: '', status: '' }],
});

const resolveContext = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Resolve Context',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const sess = $json && $json.chatId ? $json : {};\n" +
        "const inp = $('Normalize Telegram Input').item.json;\n" +
        "const currentStep = Number(sess.currentStep || 1);\n" +
        "const stepMap = { 1: 'phone', 3: 'name', 4: 'email', 5: 'confirm', 6: 'photo', 9: 'done' };\n" +
        "let state = stepMap[currentStep] || 'phone';\n" +
        "if (state === 'done' && inp.hasMedia) state = 'photo';\n" +
        "return {\n" +
        "  chatId: inp.chatId,\n" +
        "  text: inp.text,\n" +
        "  typedPhone: String(inp.text || '').replace(/\\D/g, ''),\n" +
        "  hasMedia: inp.hasMedia,\n" +
        "  fileId: inp.fileId,\n" +
        "  currentStep,\n" +
        "  state,\n" +
        "  phone: sess.phone || '',\n" +
        "  distinctId: sess.distinctId || '',\n" +
        "  name: sess.name || '',\n" +
        "  email: sess.email || '',\n" +
        "  photoActivityId: sess.photoActivityId || ''\n" +
        "};",
    },
    position: [880, 400],
  },
  output: [{ chatId: '123456789', text: 'hola', typedPhone: '', hasMedia: false, fileId: '', currentStep: 1, state: 'phone', phone: '', distinctId: '', name: '', email: '', photoActivityId: '' }],
});

// ───────────────────────────────────────── ROUTER ─────────────────────────────────────────

const routeByState = switchCase({
  version: 3.4,
  config: {
    name: 'Route by State',
    parameters: {
      mode: 'rules',
      rules: {
        values: [
          { renameOutput: true, outputKey: 'phone', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $json.state }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'phone' }], combinator: 'and' } },
          { renameOutput: true, outputKey: 'name', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $json.state }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'name' }], combinator: 'and' } },
          { renameOutput: true, outputKey: 'email', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $json.state }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'email' }], combinator: 'and' } },
          { renameOutput: true, outputKey: 'confirm', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $json.state }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'confirm' }], combinator: 'and' } },
          { renameOutput: true, outputKey: 'photo', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $json.state }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'photo' }], combinator: 'and' } },
        ],
      },
      options: { fallbackOutput: 'extra', renameFallbackOutput: 'default' },
    },
    position: [1100, 400],
  },
  output: [{ state: 'phone' }],
});

// ───────────────────────────────────────── COLA COMPARTIDA ─────────────────────────────────────────

const persistSession = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Persist Session',
    parameters: {
      resource: 'row',
      operation: 'upsert',
      dataTableId: { __rl: true, mode: 'id', value: 'AsmN5sq4Pop0FVCi' },
      matchType: 'allConditions',
      filters: {
        conditions: [{ keyName: 'chatId', condition: 'eq', keyValue: expr('{{ $json.chatId }}') }],
      },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          chatId: expr('{{ $json.chatId }}'),
          phone: expr('{{ $json.phone }}'),
          currentStep: expr('{{ $json.nextStep }}'),
          distinctId: expr('{{ $json.distinctId }}'),
          name: expr('{{ $json.name }}'),
          email: expr('{{ $json.email }}'),
          photoActivityId: expr('{{ $json.photoActivityId }}'),
          invoiceRef: expr('{{ $json.invoiceRef }}'),
          status: expr('{{ $json.status }}'),
          replyText: expr('{{ $json.replyText }}'),
        },
        matchingColumns: ['chatId'],
        schema: [
          { id: 'chatId', displayName: 'chatId', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'phone', displayName: 'phone', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'currentStep', displayName: 'currentStep', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: false },
          { id: 'distinctId', displayName: 'distinctId', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'name', displayName: 'name', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'email', displayName: 'email', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'photoActivityId', displayName: 'photoActivityId', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'invoiceRef', displayName: 'invoiceRef', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'status', displayName: 'status', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'replyText', displayName: 'replyText', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
        ],
      },
    },
    position: [2860, 400],
  },
  output: [{ chatId: '123456789', phone: '5215512345678', currentStep: 3, status: 'awaiting_name' }],
});

const logTransaction = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Log Transaction',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const rec = {\n" +
        "  ts: new Date().toISOString(),\n" +
        "  chatId: $json.chatId || '',\n" +
        "  phone: $json.phone || '',\n" +
        "  distinctId: $json.distinctId || '',\n" +
        "  invoiceRef: $json.invoiceRef || '',\n" +
        "  status: $json.status || '',\n" +
        "  nextStep: $json.nextStep\n" +
        "};\n" +
        "console.log('[TX superlikers-tg]', JSON.stringify(rec));\n" +
        "return $json;",
    },
    position: [3080, 400],
  },
  output: [{ chatId: '123456789', status: 'awaiting_name' }],
});

const sendTelegramReply = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Send Telegram Reply',
    parameters: {
      resource: 'message',
      operation: 'sendMessage',
      chatId: expr('{{ $json.chatId }}'),
      text: expr('{{ $json.replyText }}'),
      additionalFields: { parse_mode: 'Markdown', appendAttribution: false },
    },
    position: [3300, 400],
  },
  output: [{ ok: true, result: { message_id: 1 } }],
});

// ───────────── INACTIVIDAD (rama corta desde Send Telegram Reply) ─────────────

const inactivityGate = ifElse({
  version: 2.3,
  config: {
    name: 'Is Awaiting Photo?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{ leftValue: expr("{{ $('Persist Session').item.json.status }}"), operator: { type: 'string', operation: 'equals' }, rightValue: 'awaiting_photo' }],
        combinator: 'and',
      },
    },
    position: [3520, 600],
  },
  output: [{}],
});

const waitInactivity = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: {
    name: 'Wait 5min',
    parameters: { resume: 'timeInterval', amount: 5, unit: 'minutes' },
    position: [3740, 600],
  },
  output: [{}],
});

const getSessionAgain = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Get Session Again',
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: 'AsmN5sq4Pop0FVCi' },
      matchType: 'allConditions',
      filters: {
        conditions: [{ keyName: 'chatId', condition: 'eq', keyValue: expr("{{ $('Persist Session').item.json.chatId }}") }],
      },
      returnAll: false,
      limit: 1,
    },
    position: [3960, 600],
  },
  output: [{ chatId: '123456789', status: 'awaiting_photo' }],
});

const stillAwaitingPhoto = ifElse({
  version: 2.3,
  config: {
    name: 'Still Awaiting Photo?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{ leftValue: expr('{{ $json.status }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'awaiting_photo' }],
        combinator: 'and',
      },
    },
    position: [4180, 600],
  },
  output: [{}],
});

const sendPhotoReminder = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Send Telegram Photo Reminder',
    parameters: {
      resource: 'message',
      operation: 'sendMessage',
      chatId: expr('{{ $json.chatId }}'),
      text: '¿Seguís ahí? Mandame la foto de tu ticket cuando puedas 📸',
      additionalFields: { appendAttribution: false },
    },
    position: [4400, 600],
  },
  output: [{ ok: true }],
});

// ───────────────────────────────────────── RAMA: PHONE ─────────────────────────────────────────

const phoneValidGate = ifElse({
  version: 2.3,
  config: {
    name: 'Is Phone Valid?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{ leftValue: expr('{{ $json.typedPhone }}'), operator: { type: 'string', operation: 'regex' }, rightValue: '^\\d{10,13}$' }],
        combinator: 'and',
      },
    },
    position: [1600, 0],
  },
  output: [{}],
});

const searchParticipant = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.3,
  config: {
    name: 'Search Participant',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'iMWPZE5gVhbc4Sge' },
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          endpoint: 'participants/search',
          method: 'POST',
          body: expr("={{ { campaign: '3z', query: { cellphone: $('Resolve Context').item.json.typedPhone } } }}"),
        },
        schema: [
          { id: 'endpoint', displayName: 'endpoint', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'method', displayName: 'method', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'body', displayName: 'body', required: false, defaultMatch: false, display: true, type: 'object', canBeUsedToMatch: false },
        ],
      },
      options: { waitForSubWorkflow: true },
    },
    position: [1820, -100],
  },
  output: [{ ok: true, statusCode: 200, data: { participants: [] }, errorType: 'none' }],
});

const decideAfterSearch = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Decide After Search',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const ctx = $('Resolve Context').item.json;\n" +
        "const res = $json || {};\n" +
        "const data = res.data || {};\n" +
        "const list = data.participants || data.results || (Array.isArray(data) ? data : []);\n" +
        "const found = list && list.length ? list[0] : null;\n" +
        "const typedPhone = ctx.typedPhone || '';\n" +
        "if (found && (found.email || found.distinct_id)) {\n" +
        "  return {\n" +
        "    chatId: ctx.chatId, phone: typedPhone,\n" +
        "    nextStep: 6,\n" +
        "    distinctId: found.email || found.distinct_id,\n" +
        "    name: found.name || ctx.name || '',\n" +
        "    email: found.email || '',\n" +
        "    photoActivityId: '', invoiceRef: '',\n" +
        "    replyText: '¡Te encontré! 📸 Mandame la foto de tu ticket o factura.',\n" +
        "    status: 'awaiting_photo'\n" +
        "  };\n" +
        "}\n" +
        "return {\n" +
        "  chatId: ctx.chatId, phone: typedPhone,\n" +
        "  nextStep: 3,\n" +
        "  distinctId: '', name: ctx.name || '', email: '', photoActivityId: '', invoiceRef: '',\n" +
        "  replyText: '¡Hola! Para registrarte, ¿cuál es tu nombre completo?',\n" +
        "  status: 'awaiting_name'\n" +
        "};",
    },
    position: [2040, -100],
  },
  output: [{ chatId: '123456789', phone: '5215512345678', nextStep: 3, status: 'awaiting_name', replyText: '...' }],
});

const askPhoneAgain = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Ask Phone Again',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const ctx = $('Resolve Context').item.json;\n" +
        "return {\n" +
        "  chatId: ctx.chatId, phone: ctx.phone,\n" +
        "  nextStep: 1, distinctId: ctx.distinctId, name: ctx.name, email: ctx.email,\n" +
        "  photoActivityId: ctx.photoActivityId, invoiceRef: '',\n" +
        "  replyText: 'Pasame tu número de celular (solo números, 10 dígitos) 📱',\n" +
        "  status: 'awaiting_phone'\n" +
        "};",
    },
    position: [1820, 120],
  },
  output: [{ chatId: '123456789', nextStep: 1, status: 'awaiting_phone', replyText: '...' }],
});

const defaultToPhone = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Default To Phone',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const ctx = $('Resolve Context').item.json;\n" +
        "return {\n" +
        "  chatId: ctx.chatId, phone: ctx.phone,\n" +
        "  nextStep: 1, distinctId: ctx.distinctId, name: ctx.name, email: ctx.email,\n" +
        "  photoActivityId: ctx.photoActivityId, invoiceRef: '',\n" +
        "  replyText: '¡Hola! Para empezar, pasame tu número de celular (10 dígitos) 📱',\n" +
        "  status: 'awaiting_phone'\n" +
        "};",
    },
    position: [1820, 240],
  },
  output: [{ chatId: '123456789', nextStep: 1, status: 'awaiting_phone', replyText: '...' }],
});

// ───────────────────────────────────────── RAMA: NAME ─────────────────────────────────────────

const captureName = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Capture Name',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const ctx = $('Resolve Context').item.json;\n" +
        "const text = (ctx.text || '').trim();\n" +
        "if (text) {\n" +
        "  return {\n" +
        "    chatId: ctx.chatId, phone: ctx.phone,\n" +
        "    nextStep: 4, distinctId: ctx.distinctId, name: text, email: ctx.email,\n" +
        "    photoActivityId: ctx.photoActivityId, invoiceRef: '',\n" +
        "    replyText: '¡Gracias! Ahora tu correo electrónico ✉️',\n" +
        "    status: 'awaiting_email'\n" +
        "  };\n" +
        "}\n" +
        "return {\n" +
        "  chatId: ctx.chatId, phone: ctx.phone,\n" +
        "  nextStep: 3, distinctId: ctx.distinctId, name: ctx.name, email: ctx.email,\n" +
        "  photoActivityId: ctx.photoActivityId, invoiceRef: '',\n" +
        "  replyText: 'No te entendí. ¿Cuál es tu nombre completo?',\n" +
        "  status: 'awaiting_name'\n" +
        "};",
    },
    position: [1600, 300],
  },
  output: [{ chatId: '123456789', nextStep: 4, name: 'Juan', status: 'awaiting_email', replyText: '...' }],
});

// ───────────────────────────────────────── RAMA: EMAIL ─────────────────────────────────────────

const emailValidGate = ifElse({
  version: 2.3,
  config: {
    name: 'Is Email Valid?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{ leftValue: expr('{{ $json.text }}'), operator: { type: 'string', operation: 'regex' }, rightValue: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' }],
        combinator: 'and',
      },
    },
    position: [1600, 560],
  },
  output: [{}],
});

const saveEmailSummary = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Save Email & Summary',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const ctx = $('Resolve Context').item.json;\n" +
        "const email = (ctx.text || '').trim().toLowerCase();\n" +
        "return {\n" +
        "  chatId: ctx.chatId, phone: ctx.phone,\n" +
        "  nextStep: 5, distinctId: email, name: ctx.name, email: email,\n" +
        "  photoActivityId: ctx.photoActivityId, invoiceRef: '',\n" +
        "  replyText: 'Confirmemos: Nombre ' + ctx.name + ', Cel ' + ctx.phone + ', Correo ' + email + '. ¿Es correcto? Respondé SÍ para continuar.',\n" +
        "  status: 'awaiting_confirm'\n" +
        "};",
    },
    position: [1820, 460],
  },
  output: [{ chatId: '123456789', nextStep: 5, email: 'juan@mail.com', status: 'awaiting_confirm', replyText: '...' }],
});

const askEmailAgain = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Ask Email Again',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const ctx = $('Resolve Context').item.json;\n" +
        "return {\n" +
        "  chatId: ctx.chatId, phone: ctx.phone,\n" +
        "  nextStep: 4, distinctId: ctx.distinctId, name: ctx.name, email: ctx.email,\n" +
        "  photoActivityId: ctx.photoActivityId, invoiceRef: '',\n" +
        "  replyText: 'Ese correo no parece válido. Mandámelo de nuevo ✉️',\n" +
        "  status: 'awaiting_email'\n" +
        "};",
    },
    position: [1820, 660],
  },
  output: [{ chatId: '123456789', nextStep: 4, status: 'awaiting_email', replyText: '...' }],
});

// ───────────────────────────────────────── RAMA: CONFIRM ─────────────────────────────────────────

const understandConfirm = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.3,
  config: {
    name: 'Understand Confirmation',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'EI6Ax3aTtjVGRwAp' },
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          expecting: 'confirmacion',
          userText: expr("{{ $('Resolve Context').item.json.text }}"),
        },
        schema: [
          { id: 'expecting', displayName: 'expecting', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'userText', displayName: 'userText', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
        ],
      },
      options: { waitForSubWorkflow: true },
    },
    position: [1600, 820],
  },
  output: [{ field: 'confirmacion', value: 'si', is_valid: true, reason: '', reply_text: '', next_action: 'avanzar' }],
});

const routeConfirmAction = switchCase({
  version: 3.4,
  config: {
    name: 'Route Confirm Action',
    parameters: {
      mode: 'rules',
      rules: {
        values: [
          { renameOutput: true, outputKey: 'avanzar', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $json.next_action }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'avanzar' }], combinator: 'and' } },
          { renameOutput: true, outputKey: 'cancelar', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $json.next_action }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'cancelar' }], combinator: 'and' } },
        ],
      },
      options: { fallbackOutput: 'extra', renameFallbackOutput: 'reintentar' },
    },
    position: [1820, 820],
  },
  output: [{ next_action: 'avanzar' }],
});

const registerParticipant = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.3,
  config: {
    name: 'Register Participant',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'iMWPZE5gVhbc4Sge' },
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          endpoint: 'participants',
          method: 'POST',
          body: expr("={{ { campaign: '3z', properties: { name: $('Resolve Context').item.json.name, email: $('Resolve Context').item.json.email, celular: $('Resolve Context').item.json.phone }, active: true, verified_cellphone: true, not_send_verify_registration: true } }}"),
        },
        schema: [
          { id: 'endpoint', displayName: 'endpoint', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'method', displayName: 'method', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'body', displayName: 'body', required: false, defaultMatch: false, display: true, type: 'object', canBeUsedToMatch: false },
        ],
      },
      options: { waitForSubWorkflow: true },
    },
    position: [2040, 720],
  },
  output: [{ ok: true, statusCode: 200, data: {}, errorType: 'none' }],
});

const afterRegister = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'After Register',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const ctx = $('Resolve Context').item.json;\n" +
        "return {\n" +
        "  chatId: ctx.chatId, phone: ctx.phone,\n" +
        "  nextStep: 6, distinctId: ctx.email, name: ctx.name, email: ctx.email,\n" +
        "  photoActivityId: '', invoiceRef: '',\n" +
        "  replyText: '¡Listo, quedaste registrado! 📸 Mandame la foto de tu ticket.',\n" +
        "  status: 'awaiting_photo'\n" +
        "};",
    },
    position: [2260, 720],
  },
  output: [{ chatId: '123456789', nextStep: 6, status: 'awaiting_photo', replyText: '...' }],
});

const cancelConfirm = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Cancel Confirm',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const ctx = $('Resolve Context').item.json;\n" +
        "return {\n" +
        "  chatId: ctx.chatId, phone: ctx.phone,\n" +
        "  nextStep: 3, distinctId: '', name: '', email: '',\n" +
        "  photoActivityId: '', invoiceRef: '',\n" +
        "  replyText: 'Sin problema, empecemos de nuevo. ¿Tu nombre?',\n" +
        "  status: 'awaiting_name'\n" +
        "};",
    },
    position: [2040, 900],
  },
  output: [{ chatId: '123456789', nextStep: 3, status: 'awaiting_name', replyText: '...' }],
});

const retryConfirm = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Retry Confirm',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const ctx = $('Resolve Context').item.json;\n" +
        "const reply = $json.reply_text || 'No te entendí. Respondé SÍ para confirmar o NO para corregir.';\n" +
        "return {\n" +
        "  chatId: ctx.chatId, phone: ctx.phone,\n" +
        "  nextStep: 5, distinctId: ctx.distinctId, name: ctx.name, email: ctx.email,\n" +
        "  photoActivityId: ctx.photoActivityId, invoiceRef: '',\n" +
        "  replyText: reply,\n" +
        "  status: 'awaiting_confirm'\n" +
        "};",
    },
    position: [2040, 1080],
  },
  output: [{ chatId: '123456789', nextStep: 5, status: 'awaiting_confirm', replyText: '...' }],
});

// ───────────────────────────────────────── RAMA: PHOTO ─────────────────────────────────────────

const hasMediaGate = ifElse({
  version: 2.3,
  config: {
    name: 'Has Media?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.hasMedia }}'), operator: { type: 'boolean', operation: 'true' } }],
        combinator: 'and',
      },
    },
    position: [1600, 1300],
  },
  output: [{}],
});

const downloadMedia = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Download Telegram Media',
    onError: 'continueErrorOutput',
    parameters: {
      resource: 'file',
      operation: 'get',
      fileId: expr("{{ $('Resolve Context').item.json.fileId }}"),
      download: true,
    },
    position: [1820, 1200],
  },
  output: [{ result: { file_id: 'AgACx', file_path: 'photos/file_1.jpg', file_size: 8192 } }],
});

const downloadFailed = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Download Failed',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const ctx = $('Resolve Context').item.json;\n" +
        "return {\n" +
        "  chatId: ctx.chatId, phone: ctx.phone,\n" +
        "  nextStep: 6, distinctId: ctx.distinctId, name: ctx.name, email: ctx.email,\n" +
        "  photoActivityId: ctx.photoActivityId, invoiceRef: '',\n" +
        "  replyText: 'No pude descargar tu foto, reintentá 📷',\n" +
        "  status: 'awaiting_photo'\n" +
        "};",
    },
    position: [2040, 1420],
  },
  output: [{ chatId: '123456789', nextStep: 6, distinctId: 'juan@mail.com', name: 'Juan', email: 'juan@mail.com', photoActivityId: '', invoiceRef: '', replyText: '...', status: 'awaiting_photo' }],
});

const uploadPhoto = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Upload Photo',
    parameters: {
      method: 'POST',
      url: 'https://api.superlikerslabs.com/v1/photos',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBearerAuth',
      sendBody: true,
      contentType: 'multipart-form-data',
      bodyParameters: {
        parameters: [
          { name: 'campaign', value: '3z' },
          { name: 'distinct_id', value: expr("{{ $('Resolve Context').item.json.distinctId }}") },
          { name: 'title', value: 'Ticket de compra' },
          { name: 'category', value: 'tickets' },
          { parameterType: 'formBinaryData', name: 'upload_photo', inputDataFieldName: 'data' },
        ],
      },
      options: {
        timeout: 10000,
        response: { response: { fullResponse: true, neverError: true } },
      },
    },
    position: [2040, 1100],
  },
  output: [{ body: { id: 'photo_abc' }, statusCode: 200 }],
});

const readInvoice = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.3,
  config: {
    name: 'Read Invoice (Vision)',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'VeL0Lewf2pIojSsm' },
      workflowInputs: { mappingMode: 'passthrough' },
      options: { waitForSubWorkflow: true },
    },
    position: [2040, 1300],
  },
  output: [{ legible: true, ref: 'A-123', products: [], detected_type: 'ticket', reason: '', accepted_type: 'ticket' }],
});

const mergePhoto = merge({
  version: 3.2,
  config: {
    name: 'Merge Photo Results',
    parameters: {
      mode: 'combine',
      combineBy: 'combineByPosition',
      numberInputs: 2,
    },
    position: [2280, 1200],
  },
  output: [{ body: { id: 'photo_abc' }, statusCode: 200, legible: true, ref: 'A-123', products: [], detected_type: 'ticket' }],
});

const combineDecide = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Combine & Decide',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const up = $('Upload Photo').item.json; const upBody = up.body || up;\n" +
        "const upStr = JSON.stringify(upBody || {}).toLowerCase();\n" +
        "const sha1Taken = upStr.includes('sha1 is already taken');\n" +
        "const activityId = (upBody && (upBody.id || (upBody.activity && upBody.activity.id) || upBody.entry)) || '';\n" +
        "const v = $('Read Invoice (Vision)').item.json;\n" +
        "const ctx = $('Resolve Context').item.json;\n" +
        "return { chatId: ctx.chatId, phone: ctx.phone, distinctId: ctx.distinctId, name: ctx.name, email: ctx.email, sha1Taken, activityId, legible: !!v.legible, ref: v.ref || '', products: v.products || [], detected_type: v.detected_type || 'desconocido' };",
    },
    position: [2500, 1200],
  },
  output: [{ chatId: '123456789', phone: '5215512345678', distinctId: 'juan@mail.com', name: 'Juan', email: 'juan@mail.com', sha1Taken: false, activityId: 'photo_abc', legible: true, ref: 'A-123', products: [], detected_type: 'ticket' }],
});

const duplicateGate = ifElse({
  version: 2.3,
  config: {
    name: 'Is Ticket Duplicate?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.sha1Taken }}'), operator: { type: 'boolean', operation: 'true' } }],
        combinator: 'and',
      },
    },
    position: [2720, 1200],
  },
  output: [{}],
});

const duplicateTicketReply = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Duplicate Ticket Reply',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const d = $('Combine & Decide').item.json;\n" +
        "return {\n" +
        "  chatId: d.chatId, phone: d.phone,\n" +
        "  nextStep: 6, distinctId: d.distinctId, name: d.name, email: d.email,\n" +
        "  photoActivityId: d.activityId, invoiceRef: '',\n" +
        "  replyText: 'Ese ticket ya fue registrado antes ✋',\n" +
        "  status: 'awaiting_photo'\n" +
        "};",
    },
    position: [2940, 1320],
  },
  output: [{ chatId: '123456789', nextStep: 6, status: 'awaiting_photo', replyText: '...' }],
});

const legibleGate = ifElse({
  version: 2.3,
  config: {
    name: 'Is Legible?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.legible }}'), operator: { type: 'boolean', operation: 'true' } }],
        combinator: 'and',
      },
    },
    position: [2940, 1100],
  },
  output: [{}],
});

const retailBuy = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.3,
  config: {
    name: 'Retail Buy',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'iMWPZE5gVhbc4Sge' },
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          endpoint: 'retail/buy',
          method: 'POST',
          body: expr("={{ { campaign: '3z', distinct_id: $('Combine & Decide').item.json.distinctId, ref: $('Combine & Decide').item.json.ref, products: $('Combine & Decide').item.json.products } }}"),
        },
        schema: [
          { id: 'endpoint', displayName: 'endpoint', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'method', displayName: 'method', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'body', displayName: 'body', required: false, defaultMatch: false, display: true, type: 'object', canBeUsedToMatch: false },
        ],
      },
      options: { waitForSubWorkflow: true },
    },
    position: [3160, 1000],
  },
  output: [{ ok: true, statusCode: 200, data: { points: 100 }, errorType: 'none' }],
});

const retailBuyResultGate = switchCase({
  version: 3.4,
  config: {
    name: 'Route Retail Result',
    parameters: {
      mode: 'rules',
      rules: {
        values: [
          { renameOutput: true, outputKey: 'duplicate', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $json.errorType }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'ref_duplicate' }], combinator: 'and' } },
          { renameOutput: true, outputKey: 'ok', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, conditions: [{ leftValue: expr('{{ $json.ok }}'), operator: { type: 'boolean', operation: 'true' } }], combinator: 'and' } },
        ],
      },
      options: { fallbackOutput: 'extra', renameFallbackOutput: 'failed' },
    },
    position: [3380, 1000],
  },
  output: [{ ok: true }],
});

const acceptEntry = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.3,
  config: {
    name: 'Accept Entry',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'iMWPZE5gVhbc4Sge' },
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          endpoint: 'entries/accept',
          method: 'POST',
          body: expr("={{ { campaign: '3z', id: $('Combine & Decide').item.json.activityId } }}"),
        },
        schema: [
          { id: 'endpoint', displayName: 'endpoint', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'method', displayName: 'method', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false },
          { id: 'body', displayName: 'body', required: false, defaultMatch: false, display: true, type: 'object', canBeUsedToMatch: false },
        ],
      },
      options: { waitForSubWorkflow: true },
    },
    position: [3600, 900],
  },
  output: [{ ok: true, statusCode: 200, data: {}, errorType: 'none' }],
});

const afterAccept = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'After Accept',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const d = $('Combine & Decide').item.json;\n" +
        "const buy = $('Retail Buy').item.json || {};\n" +
        "const acc = $json || {};\n" +
        "const execErr = (acc.data && acc.data.execution_error) || (buy.data && buy.data.execution_error) || acc.errorType === 'execution_error' || buy.errorType === 'execution_error';\n" +
        "if (execErr) {\n" +
        "  return {\n" +
        "    chatId: d.chatId, phone: d.phone,\n" +
        "    nextStep: 9, distinctId: d.distinctId, name: d.name, email: d.email,\n" +
        "    photoActivityId: d.activityId, invoiceRef: d.ref,\n" +
        "    replyText: 'Tu ticket quedó en revisión manual 🕒',\n" +
        "    status: 'manual_review'\n" +
        "  };\n" +
        "}\n" +
        "const points = (buy.data && (buy.data.points || buy.data.earned_points)) || (acc.data && acc.data.points) || '';\n" +
        "return {\n" +
        "  chatId: d.chatId, phone: d.phone,\n" +
        "  nextStep: 9, distinctId: d.distinctId, name: d.name, email: d.email,\n" +
        "  photoActivityId: d.activityId, invoiceRef: d.ref,\n" +
        "  replyText: points ? ('🎉 ¡Listo! Ganaste ' + points + ' puntos.') : '🎉 ¡Listo! Ganaste tus puntos.',\n" +
        "  status: 'completed'\n" +
        "};",
    },
    position: [3820, 900],
  },
  output: [{ chatId: '123456789', nextStep: 9, status: 'completed', replyText: '...' }],
});

const refDuplicateReply = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Ref Duplicate Reply',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const d = $('Combine & Decide').item.json;\n" +
        "return {\n" +
        "  chatId: d.chatId, phone: d.phone,\n" +
        "  nextStep: 6, distinctId: d.distinctId, name: d.name, email: d.email,\n" +
        "  photoActivityId: d.activityId, invoiceRef: '',\n" +
        "  replyText: 'Esa compra ya generó puntos ✋',\n" +
        "  status: 'awaiting_photo'\n" +
        "};",
    },
    position: [3600, 1100],
  },
  output: [{ chatId: '123456789', nextStep: 6, status: 'awaiting_photo', replyText: '...' }],
});

const retailFailedReply = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Retail Failed Reply',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const d = $('Combine & Decide').item.json;\n" +
        "return {\n" +
        "  chatId: d.chatId, phone: d.phone,\n" +
        "  nextStep: 6, distinctId: d.distinctId, name: d.name, email: d.email,\n" +
        "  photoActivityId: d.activityId, invoiceRef: '',\n" +
        "  replyText: 'Hubo un problema registrando tu compra, intentá más tarde',\n" +
        "  status: 'awaiting_photo'\n" +
        "};",
    },
    position: [3600, 1280],
  },
  output: [{ chatId: '123456789', nextStep: 6, status: 'awaiting_photo', replyText: '...' }],
});

const notLegibleReply = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Not Legible Reply',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const d = $('Combine & Decide').item.json;\n" +
        "return {\n" +
        "  chatId: d.chatId, phone: d.phone,\n" +
        "  nextStep: 6, distinctId: d.distinctId, name: d.name, email: d.email,\n" +
        "  photoActivityId: '', invoiceRef: '',\n" +
        "  replyText: 'Recibí un/a ' + (d.detected_type || 'documento') + ', no un ticket 📷. Mandame una foto clara de tu factura (JPG/PNG).',\n" +
        "  status: 'awaiting_photo'\n" +
        "};",
    },
    position: [2940, 1480],
  },
  output: [{ chatId: '123456789', nextStep: 6, status: 'awaiting_photo', replyText: '...' }],
});

const remindPhoto = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Remind Photo',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode:
        "const ctx = $('Resolve Context').item.json;\n" +
        "return {\n" +
        "  chatId: ctx.chatId, phone: ctx.phone,\n" +
        "  nextStep: 6, distinctId: ctx.distinctId, name: ctx.name, email: ctx.email,\n" +
        "  photoActivityId: ctx.photoActivityId, invoiceRef: '',\n" +
        "  replyText: 'Necesito la *foto* de tu ticket 📸 (no texto).',\n" +
        "  status: 'awaiting_photo'\n" +
        "};",
    },
    position: [1820, 1420],
  },
  output: [{ chatId: '123456789', nextStep: 6, status: 'awaiting_photo', replyText: '...' }],
});

// ───────────────────────────────────────── STICKIES ─────────────────────────────────────────

const noteIngress = sticky('## 📥 Ingress\nTelegram Trigger → log crudo → normalizar update (chatId, text, photo file_id) → cargar sesión por chatId → resolver estado FSM', [telegramTrigger, logIncomingEvent, normalizeTelegramInput, getSession, resolveContext], { color: 4 });
const noteRouter = sticky('## 🔀 FSM Router\nRutea por estado: phone / name / email / confirm / photo (default → phone)', [routeByState], { color: 3 });
const noteQueue = sticky('## 📤 Cola compartida\nPersistir sesión (key chatId) → log → responder por Telegram. Rama de inactividad: si sigue awaiting_photo, recordar tras 5 min.', [persistSession, logTransaction, sendTelegramReply], { color: 5 });
const notePhoto = sticky('## 🧾 Rama Foto (fan-out)\nDownload (Telegram getFile) → FAN-OUT a Upload /photos y a Vision (ambos leen el binario data) → Merge → Combine & Decide → duplicado/legible → retail/buy → entries/accept', [hasMediaGate, downloadMedia, uploadPhoto, readInvoice, mergePhoto, combineDecide], { color: 6 });

// ───────────────────────────────────────── WORKFLOW ─────────────────────────────────────────

export default workflow('superlikers-tg-bot', 'Superlikers: Telegram Ticket Bot (3z)')
  .add(telegramTrigger)
  .to(logIncomingEvent)
  .to(normalizeTelegramInput)
  .to(getSession)
  .to(resolveContext)
  .to(routeByState
    .onCase(0,
      phoneValidGate
        .onTrue(searchParticipant.to(decideAfterSearch.to(persistSession)))
        .onFalse(askPhoneAgain.to(persistSession))
    )
    .onCase(1,
      captureName.to(persistSession)
    )
    .onCase(2,
      emailValidGate
        .onTrue(saveEmailSummary.to(persistSession))
        .onFalse(askEmailAgain.to(persistSession))
    )
    .onCase(3,
      understandConfirm.to(routeConfirmAction
        .onCase(0, registerParticipant.to(afterRegister.to(persistSession)))
        .onCase(1, cancelConfirm.to(persistSession))
        .onCase(2, retryConfirm.to(persistSession))
      )
    )
    // NOTA: el fan-out de Download → {Upload, Vision} se ajusta vía update_workflow
    // post-create (removeConnection/addConnection). El SDK encadena .to().to()
    // linealmente, no como fan-out.
    .onCase(4,
      hasMediaGate
        .onTrue(
          downloadMedia
            .onError(downloadFailed.to(persistSession))
            .to(uploadPhoto.to(mergePhoto.input(0)))
            .to(readInvoice.to(mergePhoto.input(1)))
        )
        .onFalse(remindPhoto.to(persistSession))
    )
    .onCase(5,
      defaultToPhone.to(persistSession)
    )
  )
  .add(mergePhoto)
  .to(combineDecide)
  .to(duplicateGate
    .onTrue(duplicateTicketReply.to(persistSession))
    .onFalse(
      legibleGate
        .onTrue(
          retailBuy.to(retailBuyResultGate
            .onCase(0, refDuplicateReply.to(persistSession))
            .onCase(1, acceptEntry.to(afterAccept.to(persistSession)))
            .onCase(2, retailFailedReply.to(persistSession))
          )
        )
        .onFalse(notLegibleReply.to(persistSession))
    )
  )
  .add(persistSession)
  .to(logTransaction)
  .to(sendTelegramReply)
  .to(inactivityGate
    .onTrue(waitInactivity.to(getSessionAgain.to(
      stillAwaitingPhoto.onTrue(sendPhotoReminder)
    )))
  )
  .add(noteIngress)
  .add(noteRouter)
  .add(noteQueue)
  .add(notePhoto);
