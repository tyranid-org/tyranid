import Tyr from './tyr';

// prettier-ignore
const MediaType = new Tyr.Collection({
  id: '_mt',
  name: 'mediaType',
  dbName: 'mediaType',
  enum: true,
  client: false,
  internal: true,
  fields: {
    _id: { is: 'string', labelField: true, label: 'Media Type' },
    extensions: { is: 'array', of: 'string' },
    name: { is: 'string' },
    notes: { is: 'string' },
    obsolete: { is: 'string', help: 'This is an obsolete media type and this values contains the new value to use.' },
    unsafe: { is: 'boolean', help: 'This file is not safe to download as a link' }
  },
  values: [
    // TODO:  this is a partial list ... add more/all entries from http://www.iana.org/assignments/media-types/media-types.xhtml as needed
    ['_id', 'extensions', 'name'],

    // TODO:  add boolean flag that marks whether the content can be downloaded directly ... unsafe boolean, only mark on certain ones

    ['application/ecmascript', ['es'], 'EcmaScript module', { unsafe: true } ],
    ['application/emf', ['emf'], 'Windows Enhanced Metafile'],
    ['application/excel', ['xlt', 'xla', 'xls'], 'Microsoft Excel' ],
    ['application/epub+zip', ['epub'], 'Electronic publication (EPUB)'],
    ['application/java-archive', ['jar'], 'Java Archive (JAR)'],
    ['application/javascript', ['js', 'mjs'], 'JavaScript, JavaScript module', { unsafe: true }],
    ['application/json', ['json'], 'JSON format'],
    ['application/mp4', ['mp4'], 'MPEG 4'],
    ['application/msword', ['doc', 'dot'], 'Microsoft Word'],
    ['application/octet-stream', ['bin'], 'binary data', { notes: 'Any kind of binary data' }],
    ['application/ogg', ['ogx'], 'OGG'],
    ['application/pdf', ['pdf'], 'Adobe Portable Document Format (PDF)'],
    ['application/rtf', ['rtf'], 'Rich Text Format (RTF)'],
    ['application/vnd.amazon.ebook', ['azw'], 'Amazon Kindle eBook format'],
    ['application/vnd.apple.installer+xml', ['mpkg'], 'Apple Installer Package'],
    ['application/vnd.mozilla.xul+xml', ['xul'], 'XUL'], ['application/vnd.ms-excel', ['xls'], 'Microsoft Excel'],
    ['application/vnd.ms-access', ['mdb'], 'Microsoft Access' ],
    ['application/vnd.ms-excel', ['xlt', 'xla', 'xls'], 'Microsoft Excel' ],
    ['application/vnd.ms-excel.addin.macroEnabled.12', ['xlam'], 'Microsoft Excel Addin (Macro Enabled)' ],
    ['application/vnd.ms-excel.sheet.macroEnabled.12', ['xlsm'], 'Microsoft Excel (Macro Enabled)' ],
    ['application/vnd.ms-excel.sheet.binary.macroEnabled.12', ['xlsb'], 'Microsoft Excel Binary (Macro Enabled)' ],
    ['application/vnd.ms-excel.template.macroEnabled.12', ['xltm'], 'Microsoft Excel Template (Macro Enabled)' ],
    ['application/vnd.ms-fontobject', ['eot'], 'MS Embedded OpenType fonts' ],
    ['application/vnd.ms-powerpoint', ['ppt', 'pot', 'pps', 'ppa'], 'Microsoft PowerPoint'],
    ['application/vnd.ms-word.document.macroEnabled.12', ['docm'], 'Microsoft Word (Macro Enabled)' ],
    ['application/vnd.ms-word.powerpoint.addin.macroEnabled.12', ['ppam'], 'Microsoft PowerPoint Addin (Macro Enabled)' ],
    ['application/vnd.ms-word.powerpoint.presentation.macroEnabled.12', ['pptm'], 'Microsoft PowerPoint Presentation (Macro Enabled)' ],
    ['application/vnd.ms-word.powerpoint.slideshow.macroEnabled.12', ['ppsm'], 'Microsoft PowerPoint Slideshow (Macro Enabled)' ],
    ['application/vnd.ms-word.powerpoint.template.macroEnabled.12', ['potm'], 'Microsoft PowerPoint Template (Macro Enabled)' ],
    ['application/vnd.ms-word.template.macroEnabled.12', ['dotm'], 'Microsoft Word Template (Macro Enabled)' ],
    ['application/vnd.oasis.opendocument.presentation', ['odp'], 'OpenDocument presentation document' ],
    ['application/vnd.oasis.opendocument.spreadsheet', ['ods'], 'OpenDocument spreadsheet document' ],
    ['application/vnd.oasis.opendocument.text', ['odt'], 'OpenDocument text document' ],
    ['application/vnd.openxmlformats-officedocument.presentationml.presentation', ['pptx'], 'Microsoft PowerPoint (OpenXML)' ],
    ['application/vnd.openxmlformats-officedocument.presentationml.slideshow', ['ppsx'], 'Microsoft PowerPoint Slideshow (OpenXML)' ],
    ['application/vnd.openxmlformats-officedocument.presentationml.template', ['potx'], 'Microsoft PowerPoint Template (OpenXML)' ],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ['xlsx'], 'Microsoft Excel (OpenXML)' ],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.template', ['xltx'], 'Microsoft Excel Template (OpenXML)' ],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ['docx'], 'Microsoft Word (OpenXML)' ],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.template', ['dotx'], 'Microsoft Word Template (OpenXML)' ],
    ['application/vnd.visio', ['vsd'], 'Microsoft Visio'],
    ['application/x-abiword', ['abw'], 'AbiWord document'],
    ['application/x-bzip', ['bz'], 'BZip archive'],
    ['application/x-bzip2', ['bz2'], 'BZip2 archive'],
    ['application/x-compressed', ['zip'], 'ZIP Archive', { unsafe: true }],
    ['application/x-csh', ['csh'], 'C-Shell script'],
    ['application/x-emf', ['emf'], 'Windows Enhanced Metafile'],
    ['application/x-excel', ['xlt', 'xla', 'xls'], 'Microsoft Excel' ],
    ['application/x-freearc', ['arc'], 'Archive document (multiple files embedded)' ],
    ['application/x-iwork-keynote-sffkey', ['keynote'], 'Apple iWork Keynote'],
    ['application/x-iwork-numbers-sffnumbers', ['numbers'], 'Apple iWork Numbers'],
    ['application/x-iwork-pages-sffpages', ['pages'], 'Apple iWork Pages'],
    ['application/x-javascript', ['mjs'], 'JavaScript', { obsolete: 'application/javascript', unsafe: true }],
    ['application/x-msexcel', ['xlt', 'xla', 'xls'], 'Microsoft Excel' ],
    ['application/x-rar-compressed', ['rar'], 'RAR archive'],
    ['application/x-rtf', ['rtf'], 'Rich Text Format (RTF)'],
    ['application/x-shockwave-flash', ['swf'], 'Small web format (SWF) or Adobe Flash document' ],
    ['application/x-tar', ['tar'], 'Tape Archive (TAR)'],
    ['application/x-sh', ['sh'], 'Bourne shell script'],
    ['application/x-7z-compressed', ['7z'], '7-zip archive'],
    ['application/x-zip-compressed', ['zip'], 'ZIP archive', { unsafe: true }],
    ['application/xhtml+xml', ['xhtml'], 'XHTML', { unsafe: true }],
    ['application/xml', ['xml'], 'XML; not readable from casual users (RFC 3023, section 3)' ],
    ['application/zip', ['zip'], 'ZIP archive', { unsafe: true }],

    ['audio/3gpp', ['3gp'], '3GPP audio/video container; if it does not contain video' ],
    ['audio/3gpp2', ['3g2'], '3GPP2 audio/video container; if it does not contain video' ],
    ['audio/aac', ['aac'], 'AAC audio'],
    ['audio/midi', ['mid', 'midi'], 'Musical Instrument Digital Interface (MIDI)' ],
    ['audio/mpeg', ['mp3', 'mpg'], 'MP3 audio'],
    ['audio/mpeg3', ['mp3'], 'MP3 audio'],
    ['audio/ogg', ['oga'], 'OGG audio'],
    ['audio/wav', ['wav'], 'Waveform Audio Format'],
    ['audio/webm', ['weba'], 'WEBM audio'],
    ['audio/x-midi', ['mid', 'midi'], 'Musical Instrument Digital Interface (MIDI)' ],
    ['audio/x-mpeg-3', ['mp3'], 'MP3 audio'],
    ['audio/x-wav', ['wav'], 'Waveform Audio Format'],

    ['font/ttf', ['ttf'], 'TrueType Font'],
    ['font/otf', ['otf'], 'OpenType font'],
    ['font/woff', ['woff'], 'Web Open Font Format (WOFF)'],
    ['font/woff2', ['woff2'], 'Web Open Font Format (WOFF)'],

    ['image/bmp', ['bmp'], 'Windows OS/2 Bitmap Graphics'],
    ['image/gif', ['gif'], 'Graphics Interchange Format (GIF)'],
    ['image/jpeg', ['jpeg', 'jpg'], 'JPEG images'],
    ['image/png', ['png'], 'Portable Network Graphics'],
    ['image/svg+xml', ['svg'], 'Scalable Vector Graphics (SVG)'],
    ['image/tiff', ['tif', 'tiff'], 'Tagged Image File Format (TIFF)'],
    ['image/vnd.microsoft.icon', ['ico'], 'Icon format'],
    ['image/webp', ['webp'], 'WEBP image'],
    ['image/x-emf', ['emf'], 'Windows Enhanced Metafile'],
    ['image/x-mgx-emf', ['emf'], 'Windows Enhanced Metafile'],
    ['image/x-icon', ['ico'], 'Icon format'],
    ['image/x-xbitmap', ['emf'], 'Windows Enhanced Metafile'],

    ['multipart/x-zip', ['zip'], 'ZIP Archive', { unsafe: true }],

    ['text/calendar', ['ics'], 'iCalendar format'],
    ['text/css', ['css'], 'Cascading Style Sheets (CSS)', { unsafe: true }],
    ['text/csv', ['csv'], 'Comma-separated values (CSV)'],
    ['text/ecmascript', ['es'], 'EcmaScript', { obsolete: 'application/ecmascript', unsafe: true }],
    ['text/html', ['htm', 'html'], 'HyperText Markup Language (HTML)', { unsafe: true }],
    ['text/javascript', ['js'], 'JavaScript', { obsolete: 'application/javascript', unsafe: true }],
    ['text/plain', ['txt', 'msg'], 'Text, (generally ASCII or ISO 8859-n)'],
    ['text/richtext', ['rtf'], 'Rich Text Format'],
    ['text/xml', ['xml'], 'XML; if readable from casual users (RFC 3023, section 3)' ],

    ['video/3gpp', ['3gp'], '3GPP; if it contains video'],
    ['video/3gpp2', ['3g2'], '3GPP2 audio/video container; if it contains video' ],
    ['video/avi', ['avi'], 'AVI: Audio Video Interleave'],
    ['video/mp4', ['m4v', 'mp4'], 'MP4 Video'],
    ['video/mpeg', ['mpeg', 'mp3', 'mpg'], 'MPEG Video'],
    ['video/ogg', ['ogv'], 'OGG video'],
    ['video/msvideo', ['avi'], 'AVI: Audio Video Interleave'],
    ['video/quicktime', ['mov', 'qt'], 'Apple QuickTime'],
    ['video/webm', ['webm'], 'WEBM video'],
    ['video/x-mpeg', ['mpeg', 'mp3'], 'MPEG Video'],
    ['video/x-msvideo', ['avi'], 'AVI: Audio Video Interleave']
  ]
});

MediaType.isValid = mediaType => {
  const mt = MediaType.byId(mediaType);

  if (mt) {
    return true;
  }

  if (!mediaType.endsWith('/*')) {
    return false;
  }

  mediaType = mediaType.substring(0, mediaType.length - 2);

  switch (mediaType) {
    case 'application':
    case 'audio':
    case 'font':
    case 'image':
    case 'text':
    case 'video':
      return true;
  }

  return false;
};

MediaType.matches = (validMediaTypes, mediaType) => {
  const [base, sub] = mediaType.split('/');

  for (const validMediaType of validMediaTypes) {
    const [vbase, vsub] = validMediaType.split('/');

    if (base === vbase && (vsub === '*' || vsub === sub)) return true;
  }

  return false;
};
