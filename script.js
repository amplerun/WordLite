/**
 * WordLite - A minimal word processor
 * No frameworks, no dependencies, just vanilla JavaScript
 */

// Main application state
const wordlite = {
    currentDocument: {
        id: Date.now().toString(),
        title: 'Untitled Document',
        content: '',
        lastSaved: null
    },
    documents: [],
    saveTimeout: null,
    isZenMode: false,
    isThemeDark: false,
    commandPaletteOpen: false,
    commands: [
        { id: 'save', name: 'Save Document', shortcut: 'Ctrl+S', action: () => wordlite.saveDocument() },
        { id: 'new', name: 'New Document', shortcut: 'Ctrl+N', action: () => wordlite.createNewDocument() },
        { id: 'zen', name: 'Toggle Zen Mode', shortcut: 'Ctrl+E', action: () => wordlite.toggleZenMode() },
        { id: 'theme', name: 'Toggle Dark Theme', shortcut: 'Ctrl+Shift+D', action: () => wordlite.toggleTheme() },
        { id: 'export-pdf', name: 'Export as PDF', shortcut: '', action: () => wordlite.exportAsPDF() },
        { id: 'export-md', name: 'Export as Markdown', shortcut: '', action: () => wordlite.exportAsMarkdown() },
        { id: 'export-wdoc', name: 'Export as WDOC', shortcut: '', action: () => wordlite.exportAsWDOC() }
    ]
};

// DOM Elements
const editor = document.getElementById('editor');
const documentTitle = document.getElementById('documentTitle');
const formatToolbar = document.getElementById('formatToolbar');
const documentList = document.getElementById('documentList');
const wordCount = document.getElementById('wordCount');
const saveStatus = document.getElementById('saveStatus');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const commandPalette = document.getElementById('commandPalette');
const commandInput = document.getElementById('commandInput');
const commandList = document.getElementById('commandList');

/**
 * Initialize the application
 */
function initApp() {
    // Load documents from localStorage
    loadDocumentsFromStorage();
    
    // Initialize document, update UI
    updateEditorContent();
    updateWordCount();
    populateDocumentList();
    
    // Setup event listeners
    setupEventListeners();
    
    // Register service worker for offline support
    registerServiceWorker();
    
    // Start autosave
    startAutoSave();
    
    // Apply saved theme preference
    applyThemePreference();
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Editor events
    editor.addEventListener('input', handleEditorInput);
    editor.addEventListener('mouseup', handleTextSelection);
    editor.addEventListener('keyup', handleTextSelection);
    
    // Document title events
    documentTitle.addEventListener('change', handleTitleChange);
    
    // Toolbar button events
    document.getElementById('btn-bold').addEventListener('click', () => formatText('bold'));
    document.getElementById('btn-italic').addEventListener('click', () => formatText('italic'));
    document.getElementById('btn-underline').addEventListener('click', () => formatText('underline'));
    document.getElementById('btn-heading').addEventListener('click', () => formatText('h1'));
    document.getElementById('btn-quote').addEventListener('click', () => formatText('quote'));
    document.getElementById('btn-code').addEventListener('click', () => formatText('code'));
    document.getElementById('btn-theme').addEventListener('click', toggleTheme);
    document.getElementById('btn-zen').addEventListener('click', toggleZenMode);
    document.getElementById('btn-save').addEventListener('click', saveDocument);
    
    // Export options
    document.getElementById('export-pdf').addEventListener('click', exportAsPDF);
    document.getElementById('export-docx').addEventListener('click', exportAsDocx);
    document.getElementById('export-md').addEventListener('click', exportAsMarkdown);
    document.getElementById('export-wdoc').addEventListener('click', exportAsWDOC);
    
    // Floating toolbar format buttons
    const formatButtons = formatToolbar.querySelectorAll('button');
    formatButtons.forEach(button => {
        button.addEventListener('click', () => {
            formatText(button.getAttribute('data-format'));
        });
    });
    
    // Sidebar toggle for mobile
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    // Set up font selection event listeners
document.querySelectorAll('[data-font]').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const font = e.target.getAttribute('data-font');
        document.execCommand('fontName', false, font);
    });
});

// Set up font size selection event listeners
document.querySelectorAll('[data-size]').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const size = e.target.getAttribute('data-size');
        document.execCommand('fontSize', false, size);
    });
});
    // New document button
    document.getElementById('newDoc').addEventListener('click', createNewDocument);
    
    // Document click handler (to hide floating toolbar)
    document.addEventListener('click', (e) => {
        if (!editor.contains(e.target) && !formatToolbar.contains(e.target)) {
            formatToolbar.style.display = 'none';
        }
        
        // Close command palette if clicking outside
        if (!commandPalette.contains(e.target) && commandPalette.style.display === 'block') {
            commandPalette.style.display = 'none';
            wordlite.commandPaletteOpen = false;
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Command palette input
    commandInput.addEventListener('input', filterCommands);
    commandInput.addEventListener('keydown', navigateCommandsList);
}
// Add event listeners for table functionality
document.getElementById('btn-table').addEventListener('click', showTableDialog);
document.getElementById('insertTableCancel').addEventListener('click', hideTableDialog);
document.getElementById('insertTableConfirm').addEventListener('click', insertTable);

// Show table dialog
function showTableDialog() {
    document.getElementById('tableDialog').style.display = 'flex';
}

// Hide table dialog
function hideTableDialog() {
    document.getElementById('tableDialog').style.display = 'none';
}

// Insert table into editor
function insertTable() {
    const rows = parseInt(document.getElementById('tableRows').value);
    const cols = parseInt(document.getElementById('tableCols').value);
    
    if (isNaN(rows) || isNaN(cols) || rows < 1 || cols < 1) {
        alert('Please enter valid numbers for rows and columns');
        return;
    }
    
    // Create table HTML
    let tableHtml = '<table border="1" style="border-collapse: collapse; width: 100%;">';
    
    // Add header row
    tableHtml += '<thead><tr>';
    for (let i = 0; i < cols; i++) {
        tableHtml += '<th style="border: 1px solid #ccc; padding: 8px;">Header ' + (i+1) + '</th>';
    }
    tableHtml += '</tr></thead>';
    
    // Add body rows
    tableHtml += '<tbody>';
    for (let i = 0; i < rows - 1; i++) {
        tableHtml += '<tr>';
        for (let j = 0; j < cols; j++) {
            tableHtml += '<td style="border: 1px solid #ccc; padding: 8px;">Cell ' + (i+1) + '-' + (j+1) + '</td>';
        }
        tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p></p>';
    
    // Insert at cursor position
    document.execCommand('insertHTML', false, tableHtml);
    
    // Hide dialog
    hideTableDialog();
}
/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(e) {
    // Command palette
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
        return;
    }
    
    // Command palette is open - handle Escape to close
    if (wordlite.commandPaletteOpen) {
        if (e.key === 'Escape') {
            commandPalette.style.display = 'none';
            wordlite.commandPaletteOpen = false;
            return;
        }
        return; // Don't process other shortcuts when command palette is open
    }
    
    // Format shortcuts
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                formatText('bold');
                break;
            case 'i':
                e.preventDefault();
                formatText('italic');
                break;
            case 'u':
                e.preventDefault();
                formatText('underline');
                break;
            case 's':
                e.preventDefault();
                saveDocument();
                break;
            case 'e':
                e.preventDefault();
                toggleZenMode();
                break;
        }
    }
    
    // Toggle dark theme
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleTheme();
    }
}

/**
 * Toggle the command palette
 */
function toggleCommandPalette() {
    wordlite.commandPaletteOpen = !wordlite.commandPaletteOpen;
    
    if (wordlite.commandPaletteOpen) {
        // Populate and show command palette
        populateCommandList();
        commandPalette.style.display = 'block';
        commandInput.value = '';
        commandInput.focus();
    } else {
        commandPalette.style.display = 'none';
    }
}

/**
 * Populate the command list
 */
function populateCommandList(filter = '') {
    commandList.innerHTML = '';
    
    const filteredCommands = wordlite.commands.filter(cmd => 
        cmd.name.toLowerCase().includes(filter.toLowerCase())
    );
    
    filteredCommands.forEach(cmd => {
        const item = document.createElement('div');
        item.className = 'command-item';
        item.innerHTML = `
            <span>${cmd.name}</span>
            <span class="shortcut">${cmd.shortcut}</span>
        `;
        item.addEventListener('click', () => {
            cmd.action();
            commandPalette.style.display = 'none';
            wordlite.commandPaletteOpen = false;
        });
        commandList.appendChild(item);
    });
}

/**
 * Filter commands based on input
 */
function filterCommands() {
    populateCommandList(commandInput.value);
}

/**
 * Navigate command list with arrow keys
 */
function navigateCommandsList(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        
        const items = commandList.querySelectorAll('.command-item');
        if (items.length === 0) return;
        
        // Find currently focused item
        const focusedItem = commandList.querySelector('.command-item:focus');
        let index = -1;
        
        if (focusedItem) {
            // Get index of currently focused item
            Array.from(items).forEach((item, i) => {
                if (item === focusedItem) index = i;
            });
        }
        
        // Calculate new index
        if (e.key === 'ArrowDown') {
            index = (index + 1) % items.length;
        } else {
            index = (index - 1 + items.length) % items.length;
        }
        
        // Focus the new item
        items[index].focus();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        
        // Execute focused command
        const focusedItem = commandList.querySelector('.command-item:focus');
        if (focusedItem) {
            focusedItem.click();
        } else {
            // Execute first command if nothing is focused
            const firstItem = commandList.querySelector('.command-item');
            if (firstItem) firstItem.click();
        }
    }
}

/**
 * Toggle Zen Mode
 */
function toggleZenMode() {
    wordlite.isZenMode = !wordlite.isZenMode;
    document.querySelector('.app').classList.toggle('zen-mode', wordlite.isZenMode);
    
    // If entering zen mode, focus editor
    if (wordlite.isZenMode) {
        editor.focus();
    }
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
    wordlite.isThemeDark = !wordlite.isThemeDark;
    document.documentElement.setAttribute('data-theme', wordlite.isThemeDark ? 'dark' : 'light');
    localStorage.setItem('wordlite-theme', wordlite.isThemeDark ? 'dark' : 'light');
}

/**
 * Apply saved theme preference
 */
function applyThemePreference() {
    const savedTheme = localStorage.getItem('wordlite-theme');
    if (savedTheme) {
        wordlite.isThemeDark = savedTheme === 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        // Check for system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            wordlite.isThemeDark = true;
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }
}

/**
 * Handle text selection and show/position the formatting toolbar
 */
function handleTextSelection() {
    const selection = window.getSelection();
    
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Only show the toolbar if text is selected within the editor
    if (selection.toString().trim() === '' || !editor.contains(range.commonAncestorContainer)) {
        formatToolbar.style.display = 'none';
        return;
    }
    
    // Get position for the toolbar
    const rect = range.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    
    // Position toolbar above the selection
    formatToolbar.style.top = `${rect.top - formatToolbar.offsetHeight - 10 + window.scrollY}px`;
    formatToolbar.style.left = `${(rect.left + rect.right) / 2 - formatToolbar.offsetWidth / 2 + window.scrollX}px`;
    formatToolbar.style.display = 'block';
    
    // Update active states for formatting buttons
    updateFormatButtonStates();
}

/**
 * Update the active states of formatting buttons based on current selection
 */
function updateFormatButtonStates() {
    const buttons = formatToolbar.querySelectorAll('button');
    buttons.forEach(button => {
        const format = button.getAttribute('data-format');
        button.classList.toggle('active', document.queryCommandState(format));
    });
}

/**
 * Apply formatting to selected text
 */
function formatText(format) {
    // Save selection
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    
    // Focus the editor
    editor.focus();
    
    // Apply formatting based on command
    switch (format) {
        case 'bold':
            document.execCommand('bold', false, null);
            break;
        case 'italic':
            document.execCommand('italic', false, null);
            break;
        case 'underline':
            document.execCommand('underline', false, null);
            break;
        case 'h1':
            document.execCommand('formatBlock', false, '<h1>');
            break;
        case 'h2':
            document.execCommand('formatBlock', false, '<h2>');
            break;
        case 'quote':
            document.execCommand('formatBlock', false, '<blockquote>');
            break;
        case 'code':
            // Check if we're in a pre block already
            const parentPre = getClosestElement(range.commonAncestorContainer, 'PRE');
            
            if (parentPre) {
                // Remove pre block
                const textContent = parentPre.textContent;
                const textNode = document.createTextNode(textContent);
                parentPre.parentNode.replaceChild(textNode, parentPre);
            } else {
                // Check if we're wrapping inline or block
                if (selection.toString().includes('\n')) {
                    // Block code
                    const pre = document.createElement('pre');
                    const code = document.createElement('code');
code.textContent = selection.toString();
                    pre.appendChild(code);
                    
                    // Replace selection with code block
                    range.deleteContents();
                    range.insertNode(pre);
                } else {
                    // Inline code
                    const code = document.createElement('code');
                    code.textContent = selection.toString();
                    
                    // Replace selection with code element
                    range.deleteContents();
                    range.insertNode(code);
                }
            }
            break;
    }
    
    // Update format button states
    updateFormatButtonStates();
    
    // Update word count
    updateWordCount();
    
    // Schedule autosave
    scheduleAutoSave();
}

/**
 * Get closest parent element matching the tag name
 */
function getClosestElement(node, tagName) {
    while (node) {
        if (node.nodeType === 1 && node.tagName === tagName) {
            return node;
        }
        node = node.parentNode;
    }
    return null;
}

/**
 * Handle editor input event
 */
function handleEditorInput() {
    updateWordCount();
    scheduleAutoSave();
}

/**
 * Update the word count in the status bar
 */
function updateWordCount() {
    const text = editor.innerText || '';
    const count = text.trim() ? text.trim().split(/\s+/).length : 0;
    wordCount.textContent = `Words: ${count}`;
}

/**
 * Handle document title change
 */
function handleTitleChange() {
    wordlite.currentDocument.title = documentTitle.value || 'Untitled Document';
    scheduleAutoSave();
}

/**
 * Schedule auto-save with debounce
 */
function scheduleAutoSave() {
    // Clear any existing timeout
    if (wordlite.saveTimeout) {
        clearTimeout(wordlite.saveTimeout);
    }
    
    // Show saving indicator
    saveStatus.textContent = 'Saving...';
    saveStatus.classList.add('saving');
    
    // Set new timeout
    wordlite.saveTimeout = setTimeout(() => {
        saveDocument();
    }, 5000); // 5 seconds delay
}

/**
 * Start auto-save interval
 */
function startAutoSave() {
    // Initial save
    saveDocument();
    
    // Set up interval for backup saves (every 30 seconds)
    setInterval(() => {
        if (wordlite.saveTimeout) {
            // If there's a pending save, do it now
            clearTimeout(wordlite.saveTimeout);
            wordlite.saveTimeout = null;
            saveDocument();
        }
    }, 30000);
}

/**
 * Save the current document
 */
function saveDocument() {
    // Get current content from editor
    wordlite.currentDocument.content = editor.innerHTML;
    wordlite.currentDocument.lastSaved = new Date().toISOString();
    
    // Find if this document already exists in our list
    const index = wordlite.documents.findIndex(doc => doc.id === wordlite.currentDocument.id);
    
    if (index !== -1) {
        // Update existing document
        wordlite.documents[index] = {...wordlite.currentDocument};
    } else {
        // Add new document
        wordlite.documents.push({...wordlite.currentDocument});
    }
    
    // Save to localStorage
    saveDocumentsToStorage();
    
    // Update UI
    populateDocumentList();
    updateSaveStatus();
}

/**
 * Update save status indicator
 */
function updateSaveStatus() {
    saveStatus.textContent = 'Saved';
    saveStatus.classList.remove('saving');
    
    if (wordlite.currentDocument.lastSaved) {
        const date = new Date(wordlite.currentDocument.lastSaved);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        saveStatus.textContent = `Saved at ${timeStr}`;
    }
}

/**
 * Create a new document
 */
function createNewDocument() {
    // Save the current one first
    saveDocument();
    
    // Create new document
    wordlite.currentDocument = {
        id: Date.now().toString(),
        title: 'Untitled Document',
        content: '<h1>New Document</h1><p>Start writing here...</p>',
        lastSaved: null
    };
    
    // Update UI
    documentTitle.value = wordlite.currentDocument.title;
    updateEditorContent();
    updateWordCount();
    
    // Focus editor
    editor.focus();
}

/**
 * Update editor with current document content
 */
function updateEditorContent() {
    editor.innerHTML = wordlite.currentDocument.content;
    documentTitle.value = wordlite.currentDocument.title;
}

/**
 * Populate document list in sidebar
 */
function populateDocumentList() {
    documentList.innerHTML = '';
    
    // Sort documents by last modified date
    const sortedDocs = [...wordlite.documents].sort((a, b) => {
        return new Date(b.lastSaved) - new Date(a.lastSaved);
    });
    
    sortedDocs.forEach(doc => {
        const item = document.createElement('div');
        item.className = 'document-item';
        if (doc.id === wordlite.currentDocument.id) {
            item.classList.add('active');
        }
        
        // Create title element
        const title = document.createElement('div');
        title.className = 'document-title';
        title.textContent = doc.title;
        
        // Create date element if available
        const date = document.createElement('div');
        date.className = 'document-date';
        if (doc.lastSaved) {
            const lastSaved = new Date(doc.lastSaved);
            date.textContent = lastSaved.toLocaleDateString();
        }
        
        // Add elements to item
        item.appendChild(title);
        item.appendChild(date);
        
        // Add click event
        item.addEventListener('click', () => loadDocument(doc.id));
        
        // Add to list
        documentList.appendChild(item);
    });
}

/**
 * Load a document by ID
 */
function loadDocument(id) {
    // Save current first
    saveDocument();
    
    // Find document
    const doc = wordlite.documents.find(d => d.id === id);
    if (!doc) return;
    
    // Set as current
    wordlite.currentDocument = {...doc};
    
    // Update UI
    updateEditorContent();
    updateWordCount();
    populateDocumentList();
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
}

/**
 * Save documents to localStorage
 */
function saveDocumentsToStorage() {
    try {
        localStorage.setItem('wordlite-documents', JSON.stringify(wordlite.documents));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        // If localStorage fails, try using IndexedDB
        saveToIndexedDB();
    }
}

/**
 * Load documents from localStorage
 */
function loadDocumentsFromStorage() {
    try {
        const storedDocs = localStorage.getItem('wordlite-documents');
        if (storedDocs) {
            wordlite.documents = JSON.parse(storedDocs);
            
            // Set current document to most recently saved
            if (wordlite.documents.length > 0) {
                const mostRecent = [...wordlite.documents].sort((a, b) => {
                    return new Date(b.lastSaved) - new Date(a.lastSaved);
                })[0];
                
                wordlite.currentDocument = {...mostRecent};
            }
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        // Try loading from IndexedDB
        loadFromIndexedDB();
    }
}

/**
 * Save to IndexedDB (fallback for large documents)
 */
function saveToIndexedDB() {
    // Basic IndexedDB implementation - expand as needed
    const request = indexedDB.open('WordLiteDB', 1);
    
    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('documents')) {
            db.createObjectStore('documents', { keyPath: 'id' });
        }
    };
    
    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['documents'], 'readwrite');
        const store = transaction.objectStore('documents');
        
        // Save each document individually
        wordlite.documents.forEach(doc => {
            store.put(doc);
        });
        
        transaction.oncomplete = () => {
            console.log('All documents saved to IndexedDB');
        };
    };
}

/**
 * Load from IndexedDB
 */
function loadFromIndexedDB() {
    const request = indexedDB.open('WordLiteDB', 1);
    
    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['documents'], 'readonly');
        const store = transaction.objectStore('documents');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
            if (getAllRequest.result.length > 0) {
                wordlite.documents = getAllRequest.result;
                
                // Set current document to most recently saved
                const mostRecent = [...wordlite.documents].sort((a, b) => {
                    return new Date(b.lastSaved) - new Date(a.lastSaved);
                })[0];
                
                wordlite.currentDocument = {...mostRecent};
                updateEditorContent();
                updateWordCount();
                populateDocumentList();
            }
        };
    };
}

/**
 * Export as PDF
 * Note: Would typically use html2pdf.js library
 */
function exportAsPDF() {
    alert('PDF export requires the html2pdf.js library. Please include it or download as WDOC instead.');
    
    // Commented code for when html2pdf is available:
    /*
    if (typeof html2pdf === 'undefined') {
        alert('PDF export requires the html2pdf.js library.');
        return;
    }
    
    const content = document.createElement('div');
    content.innerHTML = wordlite.currentDocument.content;
    
    const options = {
        margin: 10,
        filename: `${wordlite.currentDocument.title}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().from(content).set(options).save();
    */
}
function exportAsDocx() {
    // Access docx library from window.docx
    const { Document, Paragraph, TextRun, Packer } = window.docx;
    
    // Create new document
    const doc = new Document();
    
    // Simple conversion of HTML to paragraphs
    // This is basic - more complex conversion would require parsing HTML
    const content = editor.innerText;
    const paragraphs = content.split('\n').filter(p => p.trim() !== '');
    
    paragraphs.forEach(p => {
        doc.addParagraph(new Paragraph({
            children: [new TextRun(p)]
        }));
    });
    
    // Generate and download
    Packer.toBlob(doc).then(blob => {
        saveAs(blob, `${wordlite.currentDocument.title}.docx`);
    });
}
/**
 * Export as Markdown
 * Note: Would typically use Showdown.js library
 */
function exportAsMarkdown() {
    alert('Markdown export requires the Showdown.js library. Please include it or download as WDOC instead.');
    
    // Commented code for when Showdown is available:
    /*
    if (typeof showdown === 'undefined') {
        alert('Markdown export requires the Showdown.js library.');
        return;
    }
    
    const converter = new showdown.Converter();
    const html = wordlite.currentDocument.content;
    const markdown = converter.makeMarkdown(html);
    
    downloadFile(`${wordlite.currentDocument.title}.md`, markdown);
    */
}

/**
 * Export as WDOC (custom JSON format)
 */
function exportAsWDOC() {
    const wdoc = JSON.stringify({
        title: wordlite.currentDocument.title,
        content: wordlite.currentDocument.content,
        created: wordlite.currentDocument.id,
        lastModified: new Date().toISOString(),
        format: 'wdoc-1.0'
    }, null, 2);
    
    downloadFile(`${wordlite.currentDocument.title}.wdoc`, wdoc);
}

/**
 * Helper to download a file
 */
function downloadFile(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

/**
 * Register service worker for offline support
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered successfully', reg))
            .catch(err => console.error('Service Worker registration failed', err));
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
