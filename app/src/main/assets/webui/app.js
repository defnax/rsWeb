(function() {
    'use strict';

    const globals = typeof window === 'undefined' ? global : window;
    if (typeof globals.require === 'function') return;

    let modules = {},
        cache = {},
        aliases = {},
        has = {}.hasOwnProperty;

    const unalias = function(alias, loaderPath) {
        const _cmp = 'components/';
        let start = 0;
        if (loaderPath) {
            if (loaderPath.startsWith(_cmp)) {
                start = _cmp.length;
            }
            if (loaderPath.indexOf('/', start) > 0) {
                loaderPath = loaderPath.substring(
                    start,
                    loaderPath.indexOf('/', start)
                );
            }
        }
        const result =
      aliases[alias + '/index.js'] ||
      aliases[loaderPath + '/deps/' + alias + '/index.js'];
        if (result) {
            return _cmp + result.substring(0, result.length - '.js'.length);
        }
        return alias;
    };

    const expand = function(root, name) {
        const _reg = /^\.\.?(\/|$)/;
        let results = [],
            parts = (_reg.test(name) ? root + '/' + name : name).split('/');
        for (let part of parts) {
            if (part === '..') {
                results.pop();
            } else if (part !== '.' && part !== '') {
                results.push(part);
            }
        }
        return results.join('/');
    };

    const dirname = function(path) {
        return path
            .split('/')
            .slice(0, -1)
            .join('/');
    };

    const localRequire = function(path) {
        return function(name) {
            let absolute = expand(dirname(path), name);
            return globals.require(absolute, path);
        };
    };

    const initModule = function(name, definition) {
        let module = { id: name, exports: {} };
        cache[name] = module;
        definition(module.exports, localRequire(name), module);
        return module.exports;
    };

    const require = function(name, loaderPath) {
        if (loaderPath === undefined) loaderPath = '/';
        let path = unalias(name, loaderPath);

        if (path in cache) return cache[path].exports;
        if (path in modules) return initModule(path, modules[path]);

        let dirIndex = expand(path, './index');
        if (dirIndex in cache) return cache[dirIndex].exports;
        if (dirIndex in modules) return initModule(dirIndex, modules[dirIndex]);

        throw new Error(
            'Cannot find module "' + name + '" from ' + '"' + loaderPath + '"'
        );
    };

    require.alias = function(from, to) {
        aliases[to] = from;
    };

    require.register = require.define = function(bundle, fn) {
        if (typeof bundle === 'object') {
            for (let key in bundle) {
                if (has.call(bundle, key)) {
                    modules[key] = bundle[key];
                }
            }
        } else {
            modules[bundle] = fn;
        }
    };

    require.list = function() {
        let result = [];
        for (let item in modules) {
            if (has.call(modules, item)) {
                result.push(item);
            }
        }
        return result;
    };

    require._cache = cache;
    globals.require = require;
})();
require.register("home", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const widget = require('widgets');

const logo = () => {
  return {
    view() {
      return m('.logo', [
        m('img', {
          src: 'images/retroshare.svg',
          alt: 'retroshare_icon',
        }),
        m('.retroshareText', [
          m('.retrotext', [m('span', 'RETRO'), 'SHARE']),
          m('b', 'secure communication for everyone'),
        ]),
      ]);
    },
  };
};

const webhelpConfirm = () => {
  return {
    view: () => [
      m('h3', 'Confirmation'),
      m('hr'),
      m('p', 'Do you want this link to be handled by your system?'),
      m('p', 'https://retrosharedocs.readthedocs.io/en/latest/'),
      m('p', 'Make sure this link has not been forged to drag you to a malicious website.'),
      m(
        'button',
        {
          onclick: () => {
            window.open('https://retrosharedocs.readthedocs.io/en/latest/');
          },
        },
        'Ok'
      ),
    ],
  };
};

const webhelp = () => {
  return {
    view() {
      return m(
        '.webhelp',
        {
          onclick: () => {
            widget.popupMessage(m(webhelpConfirm));
          },
        },
        [m('i.fas.fa-globe-europe'), m('p', 'Open Web Help')]
      );
    },
  };
};

const ConfirmCopied = () => {
  return {
    view: () => [
      m('h3', 'Copied to Clipboard'),
      m('hr'),
      m('p[style="margin: 12px 0 4px"]', 'Your Retroshare ID has been copied to Clipboard.'),
      m(
        'p[style="margin: 4px 0 12px"]',
        'Now, you can paste and send it to your friend via email or some other way.'
      ),
      m('button', {}, 'Ok'),
    ],
  };
};

const retroshareId = () => {
  function autoResize(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }
  return {
    view(v) {
      return m('.retroshareID', [
        m(
          'textarea[readonly].textArea',
          {
            id: 'retroId',
            placeholder: 'certificate',
            onclick: () => {
              document.getElementById('retroId').select();
            },
            oncreate: (vnode) => autoResize(vnode.dom),
            onupdate: (vnode) => autoResize(vnode.dom),
          },
          v.attrs.ownCert
        ),
        m('i.fas.fa-copy', {
          onclick: () => {
            document.getElementById('retroId').select();
            document.execCommand('copy');
            widget.popupMessage(m(ConfirmCopied));
          },
        }),
        m('i.fas.fa-share-alt'),
      ]);
    },
  };
};

function invalidCertPrompt() {
  widget.popupMessage([m('h3', 'Invalid RetroShare ID'), m('hr'), m('p', 'Check the ID and try again.')]);
}

function confirmAddPrompt(details, cert, long) {
  const finishButton = long
    ? m(
        'button',
        {
          onclick: async () => {
            const res = await rs.rsJsonApiRequest('/rsPeers/loadCertificateFromString', { cert });
            if (res.body.retval) {
              widget.popupMessage([
                m('h3', 'Successful'),
                m('hr'),
                m('p', 'Successfully added friend.'),
              ]);
            } else {
              widget.popupMessage([
                m('h3', 'Error'),
                m('hr'),
                m('p', 'An error occoured during adding. Friend not added.'),
              ]);
            }
          },
        },
        'Finish'
      )
    : m(
        'button',
        {
          onclick: async () => {
            const res = await rs.rsJsonApiRequest('/rsPeers/addSslOnlyFriend', {
              sslId: details.id,
              pgpId: details.gpg_id,
            });
            if (res.body.retval) {
              widget.popupMessage([
                m('h3', 'Successful'),
                m('hr'),
                m('p', 'Successfully added friend.'),
              ]);
            } else {
              widget.popupMessage([
                m('h3', 'Error'),
                m('hr'),
                m('p', 'An error occoured during adding. Friend not added.'),
              ]);
            }
          },
        },
        'Finish'
      );

  widget.popupMessage(
    m('.friend-confirmation', [
      m('.friend-confirmation__heading', [
        m('i.fas.fa-user-plus'),
        m('div', [m('h3', 'Make friend'), m('p', 'Confirm this is the person you want to add.')]),
      ]),
      m('.friend-confirmation__details', [
        m('.friend-confirmation__row', [
          m('span.friend-confirmation__label', 'Name'),
          m('strong', details.name || 'Unknown'),
        ]),
        m('.friend-confirmation__row', [
          m('span.friend-confirmation__label', 'Location'),
          m('span', details.location || 'Unknown'),
        ]),
        m('.friend-confirmation__row', [
          m('span.friend-confirmation__label', 'Peer ID'),
          m('code', details.id || 'Unknown'),
        ]),
        m('.friend-confirmation__row', [
          m('span.friend-confirmation__label', details.isHiddenNode ? 'Hidden address' : 'Address'),
          m('span', (details.isHiddenNode ? details.hiddenNodeAddress : details.extAddr) || 'Unknown'),
        ]),
      ]),
      m('.friend-confirmation__actions', finishButton),
    ]),
    'friend-confirmation-modal'
  );
}

async function addFriendFromCert(cert) {
  const retroshareId = rs.cleanRetroshareId(cert);
  if (!retroshareId) return;

  const res = await rs.rsJsonApiRequest('/rsPeers/parseShortInvite', { invite: retroshareId });

  if (res.body.retval) {
    // console.log(res.body);
    confirmAddPrompt(res.body.details, retroshareId, false);
  } else {
    rs.rsJsonApiRequest('/rsPeers/loadDetailsFromStringCert', { cert }, (data) => {
      if (!data.retval) {
        invalidCertPrompt();
        return null;
      }
      confirmAddPrompt(data.certDetails, cert, true);
    });
  }
}

const AddFriend = () => {
  let certificate = '';
  let fileName = '';

  function loadFileContents(fileListObj) {
    const file = fileListObj && fileListObj[0];
    if (!file || file.size === 0) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      certificate = e.target.result;
      fileName = file.name;
      m.redraw();
    };
    reader.readAsText(file);
  }

  return {
    view: (vnode) =>
      m('.widget.add-friend-wizard', [
        m('.add-friend-wizard__heading', [
          m('i.fas.fa-user-plus'),
          m('div', [
            m('h3', 'Add friend'),
            m('p', 'Paste your friend\'s RetroShare ID to connect.'),
          ]),
        ]),
        m(
          '.cert-drop-zone',
          {
            isDragged: false,
            ondragenter: () => (vnode.state.isDragged = true),
            ondragleave: () => (vnode.state.isDragged = false),

            // Styling element when file is dragged
            class: vnode.state.isDragged ? 'cert-drop-zone--active' : '',

            ondragover: (e) => e.preventDefault(),
            ondrop: (e) => {
              vnode.state.isDragged = false;
              e.preventDefault();
              loadFileContents(e.target.files || e.dataTransfer.files);
            },
          },

          [
            m('label[for=friend-retroshare-id]', 'Friend\'s RetroShare ID'),
            m(
              'textarea#friend-retroshare-id[rows=6][placeholder="Paste the RetroShare ID here"]',
              {
                oninput: (e) => {
                  certificate = e.target.value;
                  fileName = '';
                },
                value: certificate,
              }
            ),
            m('.add-friend-wizard__divider', [m('span', 'or')]),
            m('.add-friend-wizard__file', [
              m('label.button[for=friend-id-file]', [m('i.fas.fa-folder-open'), ' Choose ID file']),
              m('input#friend-id-file[type=file][name=certificate][accept="text/*,.rsc,.txt"]', {
                onchange: (e) => loadFileContents(e.target.files),
              }),
              m('span', fileName || 'You can also drop a text file here.'),
            ]),
            m('.add-friend-wizard__actions', [
              m(
                'button',
                {
                  disabled: !certificate.trim(),
                  onclick: () => addFriendFromCert(certificate),
                },
                [m('i.fas.fa-user-plus'), ' Add friend']
              ),
            ]),
          ]
        ),
      ]),
  };
};

const Certificate = () => {
  let ownCert = '';
  function loadOwnCert() {
    rs.rsJsonApiRequest(
      '/rsPeers/GetShortInvite',
      { formatRadix: true },
      (data) => (ownCert = decodeURIComponent(data.invite).substring(34))
    );
  }

  return {
    oninit() {
      // Load long cert by default
      loadOwnCert();
    },

    view() {
      return m('.homepage ', [
        m(logo),
        m('.certificate', [
          m('.certificate__heading', [
            m('h1', 'Welcome to Web Interface of Retroshare!'),
            'Retroshare is an Open Source Cross-platform,',
            m('br'),
            'Private and Secure Decentralized Communication Platform.',
          ]),
          m('.certificate__content', [
            m('.rsId', [
              m('p', 'This is your Retroshare ID. Copy and share with your friends!'),
              m(retroshareId, { ownCert }),
            ]),
            m('.add-friend', [
              m('h6', 'Did you receive a Retroshare ID from your friend ?'),
              m(
                'button',
                {
                  onclick: () => {
                    widget.popupMessage(m(AddFriend), 'add-friend-modal');
                  },
                },
                'Add Friend'
              ),
            ]),
            m('.webhelp-container', [m('h6', 'Do you need help with Retoshare ?'), m(webhelp)]),
          ]),
        ]),
      ]);
    },
  };
};

const Layout = () => {
  return {
    view: () => m(Certificate),
  };
};

module.exports = Layout;
 
}); 
require.register("jdenticon", function(exports, require, module) { 
const CORNER_SPRITES = {
  0: [[0.5, 1.0], [1.0, 0.0], [1.0, 1.0]],
  1: [[0.5, 0.0], [1.0, 0.0], [0.5, 1.0], [0.0, 1.0]],
  2: [[0.5, 0], [1, 0], [1, 1], [0.5, 1], [1, 0.5]],
  3: [[0, 0.5], [0.5, 0], [1, 0.5], [0.5, 1], [0.5, 0.5]],
  4: [[0, 0.5], [1, 0], [1, 1], [0, 1], [1, 0.5]],
  5: [[1, 0], [1, 1], [0.5, 1], [1, 0.5], [0.5, 0.5]],
  6: [[0, 0], [1, 0], [1, 0.5], [0, 0], [0.5, 1], [0, 1]],
  7: [[0, 0], [0.5, 0], [1, 0.5], [0.5, 1], [0, 1], [0.5, 0.5]],
  8: [[0.5, 0], [0.5, 0.5], [1, 0.5], [1, 1], [0.5, 1], [0.5, 0.5], [0, 0.5]],
  9: [[0, 0], [1, 0], [0.5, 0.5], [1, 0.5], [0.5, 1], [0.5, 0.5], [0, 1]],
  10: [[0, 0.5], [0.5, 1], [1, 0.5], [0.5, 0], [1, 0], [1, 1], [0, 1]],
  11: [[0.5, 0], [1, 0], [1, 1], [0.5, 1], [1, 0.75], [0.5, 0.5], [1, 0.25]],
  12: [[0, 0.5], [0.5, 0], [0.5, 0.5], [1, 0], [1, 0.5], [0.5, 1], [0.5, 0.5], [0, 1]],
  13: [[0, 0], [1, 0], [1, 1], [0, 1], [1, 0.5], [0.5, 0.25], [0.5, 0.75], [0, 0.5], [0.5, 0.25]],
  14: [[0, 0.5], [0.5, 0.5], [0.5, 0], [1, 0], [0.5, 0.5], [1, 0.5], [0.5, 1], [0.5, 0.5], [0, 1]],
  15: [[0, 0], [1, 0], [0.5, 0.5], [0.5, 0], [0, 0.5], [1, 0.5], [0.5, 1], [0.5, 0.5], [0, 1]]
};

const CENTER_SPRITES = {
  0: [],
  1: [[0, 0], [1, 0], [1, 1], [0, 1]],
  2: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]],
  3: [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0.5], [0.5, 1], [1, 0.5], [0.5, 0], [0, 0.5]],
  4: [[0.25, 0], [0.75, 0], [0.5, 0.5], [1, 0.25], [1, 0.75], [0.5, 0.5], [0.75, 1], [0.25, 1], [0.5, 0.5], [0, 0.75], [0, 0.25], [0.5, 0.5]],
  5: [[0, 0], [0.5, 0.25], [1, 0], [0.75, 0.5], [1, 1], [0.5, 0.75], [0, 1], [0.25, 0.5]],
  6: [[0.33, 0.33], [0.67, 0.33], [0.67, 0.67], [0.33, 0.67]],
  7: [[0, 0], [0.33, 0], [0.33, 0.33], [0.66, 0.33], [0.67, 0], [1, 0], [1, 0.33], [0.67, 0.33], [0.67, 0.67], [1, 0.67], [1, 1], [0.67, 1], [0.67, 0.67], [0.33, 0.67], [0.33, 1], [0, 1], [0, 0.67], [0.33, 0.67], [0.33, 0.33], [0, 0.33]]
};

function getSpritePoints(shapePoints, size) {
  return shapePoints.map(([rx, ry]) => `${(rx - 0.5) * size},${(ry - 0.5) * size}`).join(' ');
}

function renderPolygon(shapePoints, x, y, angle, shapeAngle, size, color) {
  if (!shapePoints || shapePoints.length === 0) return '';
  const halfSize = size / 2;
  const pointsStr = getSpritePoints(shapePoints, size);
  return `<polygon points="${pointsStr}" fill="${color}" transform="translate(${x}, ${y}) rotate(${angle}) translate(${halfSize}, ${halfSize}) rotate(${shapeAngle})"/>`;
}

function toSvg(hash, width) {
  if (!hash || hash.length < 18) {
    hash = '00000000000000000000000000000000';
  }

  const csh = parseInt(hash.substr(0, 1), 16);
  const ssh = parseInt(hash.substr(1, 1), 16);
  const xsh = parseInt(hash.substr(2, 1), 16) & 7;

  // We rotate shape by default (rotate = true)
  const cro = 90 * (parseInt(hash.substr(3, 1), 16) & 3);
  const sro = 90 * (parseInt(hash.substr(4, 1), 16) & 3);
  const xbg = parseInt(hash.substr(5, 1), 16) % 2;

  const cfr = parseInt(hash.substr(6, 2), 16);
  const cfg = parseInt(hash.substr(8, 2), 16);
  const cfb = parseInt(hash.substr(10, 2), 16);

  const sfr = parseInt(hash.substr(12, 2), 16);
  const sfg = parseInt(hash.substr(14, 2), 16);
  const sfb = parseInt(hash.substr(16, 2), 16);

  const fillCorner = `rgb(${cfr}, ${cfg}, ${cfb})`;
  const fillSide = `rgb(${sfr}, ${sfg}, ${sfb})`;

  let fillCenter;
  if (xbg > 0 && (Math.abs(cfr - sfr) > 127 || Math.abs(cfg - sfg) > 127 || Math.abs(cfb - sfb) > 127)) {
    fillCenter = fillSide;
  } else {
    fillCenter = fillCorner;
  }

  const size = width / 3;
  const totalsize = width;

  let svgContent = `<rect width="${totalsize}" height="${totalsize}" fill="rgb(230,230,230)"/>`;

  // Draw corners
  const cornerPoints = CORNER_SPRITES[csh] || CORNER_SPRITES[15];
  svgContent += renderPolygon(cornerPoints, 0, 0, 0, cro, size, fillCorner);
  svgContent += renderPolygon(cornerPoints, totalsize, 0, 90, cro, size, fillCorner);
  svgContent += renderPolygon(cornerPoints, totalsize, totalsize, 180, cro, size, fillCorner);
  svgContent += renderPolygon(cornerPoints, 0, totalsize, 270, cro, size, fillCorner);

  // Draw sides
  const sidePoints = CORNER_SPRITES[ssh] || CORNER_SPRITES[15];
  svgContent += renderPolygon(sidePoints, 0, size, 0, sro, size, fillSide);
  svgContent += renderPolygon(sidePoints, 2 * size, 0, 90, sro, size, fillSide);
  svgContent += renderPolygon(sidePoints, 3 * size, 2 * size, 180, sro, size, fillSide);
  svgContent += renderPolygon(sidePoints, size, 3 * size, 270, sro, size, fillSide);

  // Draw center
  const centerPoints = CENTER_SPRITES[xsh] !== undefined ? CENTER_SPRITES[xsh] : CORNER_SPRITES[15];
  svgContent += renderPolygon(centerPoints, size, size, 0, 0, size, fillCenter);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalsize}" height="${totalsize}" viewBox="0 0 ${totalsize} ${totalsize}">${svgContent}</svg>`;
}

module.exports = {
  toSvg
};
 
}); 
require.register("login", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');

const displayErrorMessage = function (message) {
  m.render(document.getElementById('error'), message);
};

const verifyLogin = async function (uname, passwd, url, displayAuthError = true) {
  const loginHeader = {
    Authorization: `Basic ${btoa(`${uname}:${passwd}`)}`,
  };
  if (!url.trim()) {
    displayErrorMessage('Server-url is missing, please enter json-api url');
    return;
  }
  rs.setKeys('', '', url, false);
  rs.logon(
    loginHeader,
    displayAuthError ? displayErrorMessage : () => { },
    displayErrorMessage,
    () => {
      rs.setKeys(uname, passwd, url);
      m.route.set('/home');
    }
  );
};

function loginComponent() {
  const urlParams = new URLSearchParams(window.location.search);
  let uname = urlParams.get('Username') || 'webui';
  let passwd = urlParams.get('Password') || '';
  //  Parenthesised on purpose: === binds tighter than ||, so without them the
  //  test read `(Url || protocol === 'file:') ? default : origin`, and any
  //  ?Url= given was thrown away in favour of the hardcoded default -- the one
  //  case the parameter exists for.
  let url =
    urlParams.get('Url') ||
    (window.location.protocol === 'file:'
      ? 'http://127.0.0.1:9092'
      : window.location.protocol +
      '//' +
      window.location.host +
      window.location.pathname.replace('/index.html', ''));
  let withOptions = false;

  const logo = () =>
    m('img.logo[width=30%]', { src: 'images/retroshare.svg', alt: 'retroshare_icon' });

  const inputName = () =>
    m('input', {
      id: 'username',
      type: 'text',
      value: uname,
      placeholder: 'Username',
      onchange: (e) => (uname = e.target.value),
    });
  const buttonLogin = () =>
    m(
      'button[type=submit].submit-btn#loginBtn',
      {
        onclick: (ev) => {
          ev.preventDefault();
          verifyLogin(uname, passwd, url);
        },
      },
      'Login'
    );

  const inputPassword = () =>
    m('input[autofocus]', {
      id: 'password',
      type: 'password',
      placeholder: 'Password',
      oncreate: (e) => e.dom.focus(),
      onchange: (e) => (passwd = e.target.value),
    });

  const inputUrl = () =>
    m('input', {
      id: 'url',
      type: 'text',
      placeholder: 'Url',
      value: url,
      oninput: (e) => (url = e.target.value),
    });

  const linkOptions = (action) =>
    m('a', { onclick: () => (withOptions = !withOptions) }, `${action} options`);

  const textError = () => m('p.error[id=error]');

  return {
    oninit: () => {
      if (rs.loginKey.isVerified && rs.loginKey.username && rs.loginKey.passwd) {
        verifyLogin(rs.loginKey.username, rs.loginKey.passwd, rs.loginKey.url, false);
      }
    },
    view: () => {
      return m(
        'form.login-page',
        m(
          '.login-container',
          withOptions
            ? [
              logo(),
              m('.extra', [m('label', 'Username:'), m('br'), inputName()]),
              m('.extra', [m('label', 'Password:'), m('br'), inputPassword()]),
              m('.extra', [m('label', 'Url:'), m('br'), inputUrl()]),
              linkOptions('hide'),
              buttonLogin(),
              textError(),
            ]
            : [logo(), inputPassword(), linkOptions('show'), buttonLogin(), textError()]
        )
      );
    },
  };
}

module.exports = loginComponent;
 
}); 
require.register("main", function(exports, require, module) { 
const m = require('mithril');

const login = require('login');
const rs = require('rswebui');
const home = require('home');
const network = require('network/network');
const people = require('people/people_resolver');
const chat = require('chat/chat');
const mail = require('mail/mail_resolver');
const files = require('files/files_resolver');
const channels = require('channels/channels');
const forums = require('forums/forums');
const boards = require('boards/boards');
const config = require('config/config_resolver');
const statusbar = require('statusbar');

const navIcon = {
  home: m('i.fas.fa-home.sidenav-icon'),
  network: m('i.fas.fa-share-alt.sidenav-icon'),
  people: m('i.fas.fa-users.sidenav-icon'),
  chat: m('i.fas.fa-comments.sidenav-icon'),
  mail: m('i.fas.fa-envelope.sidenav-icon'),
  files: m('i.fas.fa-folder-open.sidenav-icon'),
  channels: m('i.fas.fa-tv.sidenav-icon'),
  forums: m('i.fas.fa-bullhorn.sidenav-icon'),
  boards: m('i.fas.fa-globe.sidenav-icon'),
  config: m('i.fas.fa-cogs.sidenav-icon'),
};

const navbar = () => {
  let isCollapsed = true;
  return {
    view: (vnode) =>
      m(
        'nav.nav-menu',
        {
          class: isCollapsed ? 'collapsed' : '',
        },
        [
          m('.nav-menu__logo', [
            m(
              '.logo-container',
              {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginRight: isCollapsed ? 0 : '10px',
                },
              },
              [
                m('img', {
                  src: 'images/retroshare.svg',
                  alt: 'retroshare_icon',
                }),
              ]
            ),
            m('.nav-menu__logo-text', [m('h5', 'RetroShare')]),
          ]),
          m('.nav-menu__box', { style: { flex: 1 } }, [
            Object.keys(vnode.attrs.links).map((linkName) => {
              const active = m.route.get().split('/')[1] === linkName;
              return m(
                m.route.Link,
                {
                  href: vnode.attrs.links[linkName],
                  class: (active ? 'active-link' : '') + ' item',
                },
                [navIcon[linkName], m('span', linkName.charAt(0).toUpperCase() + linkName.slice(1))]
              );
            }),
            m(
              'button.toggle-nav',
              {
                onclick: () => (isCollapsed = !isCollapsed),
              },
              m('i.fas.fa-angle-double-left')
            ),
          ]),
          m(
            '.nav-menu__footer',
            {
              style: {
                marginTop: 'auto',
                padding: '0.75rem 0 0',
                color: '#888',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
              },
            },
            [
              m(
                '.nav-menu__status',
                {
                  style: {
                    display: 'flex',
                    flexDirection: isCollapsed ? 'column' : 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isCollapsed ? '0.35rem' : '0.6rem',
                  },
                },
                [
                  m('i.fas.fa-circle', {
                    style: {
                      color: rs.connectionState.status ? '#2ecc71' : '#e74c3c',
                      fontSize: '0.6em',
                      transition: 'color 0.3s ease',
                    },
                    title: rs.connectionState.status
                      ? 'Connected to RetroShare Core'
                      : 'Connection Lost',
                  }),
                  m('span.webui-version', { style: { fontSize: '0.7em' } }, 'v139'),
                  m('i.fas.fa-sync-alt.refresh-icon', {
                    style: { cursor: 'pointer', fontSize: '0.8em' },
                    onclick: () => window.location.reload(true),
                    title: 'Force reload application',
                  }),
                ]
              ),
              m(
                'a.logout-link.item',
                {
                  onclick: () => rs.logout(),
                  style: {
                    cursor: 'pointer',
                    margin: 0,
                    padding: isCollapsed ? '0.675rem 0' : '0.675rem 0.5rem',
                    width: isCollapsed ? '2.5rem' : '10rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    lineHeight: 1,
                    borderRadius: '0.5rem',
                    textDecoration: 'none',
                    color: '#ccc',
                    textTransform: 'capitalize',
                  },
                },
                [
                  m('i.fas.fa-sign-out-alt.sidenav-icon', {
                    style: {
                      width: '2.5rem',
                      height: '1.4rem',
                      display: 'grid',
                      placeItems: 'center',
                    },
                  }),
                  !isCollapsed && m('span', 'Logout'),
                ]
              ),
            ]
          ),
        ]
      ),
  };
};

const Layout = () => {
  return {
    view: (vnode) =>
      m('.content', [
        m(navbar, {
          links: {
            home: '/home',
            network: '/network',
            people: '/people/MyContacts',
            chat: '/chat',
            mail: '/mail/inbox',
            files: '/files/files',
            channels: '/channels/MyChannels',
            forums: '/forums/MyForums',
            boards: '/boards/MyBoards',
            config: '/config/network',
          },
        }),
        m(
          '.main-container',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
            },
          },
          [
            m('.tab-content', { style: { flex: '1', overflow: 'auto' } }, vnode.children),
            m(statusbar),
          ]
        ),
      ]),
  };
};

m.route(document.getElementById('main'), '/', {
  '/': {
    render: () => m(login),
  },
  '/home': {
    render: () => m(Layout, m(home)),
  },
  '/network': {
    render: () => m(Layout, m(network)),
  },

  '/people/:tab': {
    render: (v) => m(Layout, m(people, v.attrs)),
  },
  '/chat/:lobby/:subaction': {
    render: (v) => m(Layout, m(chat, v.attrs)),
  },
  '/chat/:lobby': {
    render: (v) => m(Layout, m(chat, v.attrs)),
  },
  '/chat': {
    render: () => m(Layout, m(chat)),
  },
  '/mail/:tab': {
    render: (v) => m(Layout, m(mail, v.attrs)),
  },
  '/mail/:tab/:msgId': {
    render: (v) => m(Layout, m(mail, v.attrs)),
  },
  '/files/:tab': {
    render: (v) => m(Layout, m(files, v.attrs)),
  },
  '/files/:tab/:resultId': {
    render: (v) => m(Layout, m(files, v.attrs)),
  },
  '/channels/:tab': {
    render: (v) => m(Layout, m(channels, v.attrs)),
  },
  '/channels/:tab/:mGroupId': {
    render: (v) => m(Layout, m(channels, v.attrs)),
  },
  '/channels/:tab/:mGroupId/:mMsgId': {
    render: (v) => m(Layout, m(channels, v.attrs)),
  },
  '/forums/:tab': {
    render: (v) => m(Layout, m(forums, v.attrs)),
  },
  '/forums/:tab/:mGroupId': {
    render: (v) => m(Layout, m(forums, v.attrs)),
  },

  '/forums/:tab/:mGroupId/:mMsgId': {
    render: (v) => m(Layout, m(forums, v.attrs)),
  },
  '/boards/:tab': {
    render: (v) => m(Layout, m(boards, v.attrs)),
  },
  '/boards/:tab/:mGroupId': {
    render: (v) => m(Layout, m(boards, v.attrs)),
  },
  '/boards/:tab/:mGroupId/:mMsgId': {
    render: (v) => m(Layout, m(boards, v.attrs)),
  },
  '/config/:tab': {
    render: (v) => m(Layout, m(config, v.attrs)),
  },
});

// v51 architectural fix: ensure event queue starts on direct route refresh
if (rs.loginKey.isVerified && rs.loginKey.username && rs.loginKey.passwd) {
  rs.logon(
    { Authorization: `Basic ${btoa(`${rs.loginKey.username}:${rs.loginKey.passwd}`)}` },
    () => {}, // displayAuthError
    () => {}, // displayErrorMessage
    () => {}
  );
}
 
}); 
require.register("mithril", function(exports, require, module) { 
(function () {
  'use strict';
  function Vnode(tag, key, attrs0, children, text, dom) {
    return {
      tag: tag,
      key: key,
      attrs: attrs0,
      children: children,
      text: text,
      dom: dom,
      is: undefined,
      domSize: undefined,
      state: undefined,
      events: undefined,
      instance: undefined,
    };
  }
  Vnode.normalize = function (node) {
    if (Array.isArray(node))
      return Vnode('[', undefined, undefined, Vnode.normalizeChildren(node), undefined, undefined);
    if (node == null || typeof node === 'boolean') return null;
    if (typeof node === 'object') return node;
    return Vnode('#', undefined, undefined, String(node), undefined, undefined);
  };
  Vnode.normalizeChildren = function (input) {
    // Preallocate the array length (initially holey) and fill every index immediately in order.
    // Benchmarking shows better performance on V8.
    var children = new Array(input.length);
    // Count the number of keyed normalized vnodes for consistency check.
    // Note: this is a perf-sensitive check.
    // Fun fact: merging the loop like this is somehow faster than splitting
    // the check within updateNodes(), noticeably so.
    var numKeyed = 0;
    for (var i = 0; i < input.length; i++) {
      children[i] = Vnode.normalize(input[i]);
      if (children[i] !== null && children[i].key != null) numKeyed++;
    }
    if (numKeyed !== 0 && numKeyed !== input.length) {
      throw new TypeError(
        children.includes(null)
          ? 'In fragments, vnodes must either all have keys or none have keys. You may wish to consider using an explicit keyed empty fragment, m.fragment({key: ...}), instead of a hole.'
          : 'In fragments, vnodes must either all have keys or none have keys.'
      );
    }
    return children;
  };
  // Note: the processing of variadic parameters is perf-sensitive.
  //
  // In native ES6, it might be preferable to define hyperscript and fragment
  // factories with a final ...args parameter and call hyperscriptVnode(...args),
  // since modern engines can optimize spread calls.
  //
  // However, benchmarks showed this was not faster. As a result, spread is used
  // only in the parameter lists of hyperscript and fragment, while an array is
  // passed to hyperscriptVnode.
  var hyperscriptVnode = function (attrs1, children0) {
    if (
      attrs1 == null ||
      (typeof attrs1 === 'object' && attrs1.tag == null && !Array.isArray(attrs1))
    ) {
      if (children0.length === 1 && Array.isArray(children0[0])) children0 = children0[0];
    } else {
      children0 = children0.length === 0 && Array.isArray(attrs1) ? attrs1 : [attrs1, ...children0];
      attrs1 = undefined;
    }
    return Vnode('', attrs1 && attrs1.key, attrs1, children0);
  };
  // This exists so I'm only saving it once.
  var hasOwn = {}.hasOwnProperty;
  // This is an attrs object that is used by default when attrs is undefined or null.
  var emptyAttrs = {};
  // This Map manages the following:
  // - Whether an attrs is cached attrs generated by compileSelector().
  // - Whether the cached attrs is "static", i.e., does not contain any form attributes.
  // These information will be useful to skip updating attrs in render().
  //
  // Since the attrs used as keys in this map are not released from the selectorCache object,
  // there is no risk of memory leaks. Therefore, Map is used here instead of WeakMap.
  var cachedAttrsIsStaticMap = new Map([[emptyAttrs, true]]);
  var selectorParser =
    /(?:(^|#|\.)([^#\.\[\]]+))|(\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\5)?\])/g;
  var selectorCache = Object.create(null);
  function isEmpty(object) {
    for (var key in object) if (hasOwn.call(object, key)) return false;
    return true;
  }
  function isFormAttributeKey(key) {
    return key === 'value' || key === 'checked' || key === 'selectedIndex' || key === 'selected';
  }
  function compileSelector(selector) {
    var match,
      tag = 'div',
      classes = [],
      attrs = {},
      isStatic = true;
    while ((match = selectorParser.exec(selector))) {
      var type = match[1],
        value = match[2];
      if (type === '' && value !== '') tag = value;
      else if (type === '#') attrs.id = value;
      else if (type === '.') classes.push(value);
      else if (match[3][0] === '[') {
        var attrValue = match[6];
        if (attrValue) attrValue = attrValue.replace(/\\(["'])/g, '$1').replace(/\\\\/g, '\\');
        if (match[4] === 'class') classes.push(attrValue);
        else {
          attrs[match[4]] = attrValue === '' ? attrValue : attrValue || true;
          if (isFormAttributeKey(match[4])) isStatic = false;
        }
      }
    }
    if (classes.length > 0) attrs.className = classes.join(' ');
    if (isEmpty(attrs)) attrs = emptyAttrs;
    else cachedAttrsIsStaticMap.set(attrs, isStatic);
    return (selectorCache[selector] = { tag: tag, attrs: attrs, is: attrs.is });
  }
  function execSelector(state, vnode) {
    vnode.tag = state.tag;
    var attrs = vnode.attrs;
    if (attrs == null) {
      vnode.attrs = state.attrs;
      vnode.is = state.is;
      return vnode;
    }
    if (hasOwn.call(attrs, 'class')) {
      if (attrs.class != null) attrs.className = attrs.class;
      attrs.class = null;
    }
    if (state.attrs !== emptyAttrs) {
      var className = attrs.className;
      attrs = Object.assign({}, state.attrs, attrs);
      if (state.attrs.className != null)
        attrs.className =
          className != null
            ? String(state.attrs.className) + ' ' + String(className)
            : state.attrs.className;
    }
    // workaround for #2622 (reorder keys in attrs to set "type" first)
    // The DOM does things to inputs based on the "type", so it needs set first.
    // See: https://github.com/MithrilJS/mithril.js/issues/2622
    if (state.tag === 'input' && hasOwn.call(attrs, 'type')) {
      attrs = Object.assign({ type: attrs.type }, attrs);
    }
    // This reduces the complexity of the evaluation of "is" within the render function.
    vnode.is = attrs.is;
    vnode.attrs = attrs;
    return vnode;
  }
  function hyperscript(selector, attrs, ...children) {
    if (
      selector == null ||
      (typeof selector !== 'string' &&
        typeof selector !== 'function' &&
        typeof selector.view !== 'function')
    ) {
      throw Error('The selector must be either a string or a component.');
    }
    var vnode = hyperscriptVnode(attrs, children);
    if (typeof selector === 'string') {
      vnode.children = Vnode.normalizeChildren(vnode.children);
      if (selector !== '[')
        return execSelector(selectorCache[selector] || compileSelector(selector), vnode);
    }
    if (vnode.attrs == null) vnode.attrs = {};
    vnode.tag = selector;
    return vnode;
  }
  hyperscript.trust = function (html) {
    if (html == null) html = '';
    return Vnode('<', undefined, undefined, html, undefined, undefined);
  };
  hyperscript.fragment = function (attrs4, ...children1) {
    var vnode2 = hyperscriptVnode(attrs4, children1);
    if (vnode2.attrs == null) vnode2.attrs = {};
    vnode2.tag = '[';
    vnode2.children = Vnode.normalizeChildren(vnode2.children);
    return vnode2;
  };
  var delayedRemoval = new WeakMap();
  function* domFor(vnode4) {
    // To avoid unintended mangling of the internal bundler,
    // parameter destructuring is not used here.
    var dom = vnode4.dom;
    var domSize0 = vnode4.domSize;
    var generation0 = delayedRemoval.get(dom);
    if (dom != null)
      do {
        var nextSibling = dom.nextSibling;
        if (delayedRemoval.get(dom) === generation0) {
          yield dom;
          domSize0--;
        }
        dom = nextSibling;
      } while (domSize0);
  }
  var _14 = function () {
    var nameSpace = {
      svg: 'http://www.w3.org/2000/svg',
      math: 'http://www.w3.org/1998/Math/MathML',
    };
    var currentRedraw;
    var currentRender;
    function getDocument(dom) {
      return dom.ownerDocument;
    }
    function getNameSpace(vnode3) {
      return (vnode3.attrs && vnode3.attrs.xmlns) || nameSpace[vnode3.tag];
    }
    //sanity check to discourage people from doing `vnode.state = ...`
    function checkState(vnode3, original) {
      if (vnode3.state !== original) throw new Error("'vnode.state' must not be modified.");
    }
    //Note: the hook is passed as the `this` argument to allow proxying the
    //arguments without requiring a full array allocation to do so. It also
    //takes advantage of the fact the current `vnode` is the first argument in
    //all lifecycle methods.
    function callHook(vnode3) {
      if (typeof this !== 'function') return;
      var original = vnode3 ? vnode3.state : undefined;
      try {
        return this.apply(original, arguments);
      } finally {
        if (vnode3) checkState(vnode3, original);
      }
    }
    // IE11 (at least) throws an UnspecifiedError when accessing document.activeElement when
    // inside an iframe. Catch and swallow this error, and heavy-handidly return null.
    function activeElement(dom) {
      try {
        return getDocument(dom).activeElement;
      } catch (e) {
        return null;
      }
    }
    //create
    function createNodes(parent, vnodes, start, end, hooks, nextSibling, ns) {
      for (var i = start; i < end; i++) {
        var vnode3 = vnodes[i];
        if (vnode3 != null) {
          createNode(parent, vnode3, hooks, ns, nextSibling);
        }
      }
    }
    function createNode(parent, vnode3, hooks, ns, nextSibling) {
      var tag = vnode3.tag;
      if (typeof tag === 'string') {
        vnode3.state = {};
        if (vnode3.attrs != null) initLifecycle(vnode3.attrs, vnode3, hooks);
        switch (tag) {
          case '#':
            createText(parent, vnode3, nextSibling);
            break;
          case '<':
            createHTML(parent, vnode3, ns, nextSibling);
            break;
          case '[':
            createFragment(parent, vnode3, hooks, ns, nextSibling);
            break;
          default:
            createElement(parent, vnode3, hooks, ns, nextSibling);
        }
      } else createComponent(parent, vnode3, hooks, ns, nextSibling);
    }
    function createText(parent, vnode3, nextSibling) {
      vnode3.dom = getDocument(parent).createTextNode(vnode3.children);
      insertDOM(parent, vnode3.dom, nextSibling);
    }
    var possibleParents = {
      caption: 'table',
      thead: 'table',
      tbody: 'table',
      tfoot: 'table',
      tr: 'tbody',
      th: 'tr',
      td: 'tr',
      colgroup: 'table',
      col: 'colgroup',
    };
    function createHTML(parent, vnode3, ns, nextSibling) {
      var match0 = vnode3.children.match(/^\s*?<(\w+)/im) || [];
      // not using the proper parent makes the child element(s) vanish.
      //     var div = document.createElement("div")
      //     div.innerHTML = "<td>i</td><td>j</td>"
      //     console.log(div.innerHTML)
      // --> "ij", no <td> in sight.
      var temp = getDocument(parent).createElement(possibleParents[match0[1]] || 'div');
      if (ns === 'http://www.w3.org/2000/svg') {
        temp.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg">' + vnode3.children + '</svg>';
        temp = temp.firstChild;
      } else {
        temp.innerHTML = vnode3.children;
      }
      vnode3.dom = temp.firstChild;
      vnode3.domSize = temp.childNodes.length;
      var fragment = getDocument(parent).createDocumentFragment();
      var child;
      while ((child = temp.firstChild)) {
        fragment.appendChild(child);
      }
      insertDOM(parent, fragment, nextSibling);
    }
    function createFragment(parent, vnode3, hooks, ns, nextSibling) {
      var fragment = getDocument(parent).createDocumentFragment();
      if (vnode3.children != null) {
        var children2 = vnode3.children;
        createNodes(fragment, children2, 0, children2.length, hooks, null, ns);
      }
      vnode3.dom = fragment.firstChild;
      vnode3.domSize = fragment.childNodes.length;
      insertDOM(parent, fragment, nextSibling);
    }
    function createElement(parent, vnode3, hooks, ns, nextSibling) {
      var tag = vnode3.tag;
      var attrs5 = vnode3.attrs;
      var is = vnode3.is;
      ns = getNameSpace(vnode3) || ns;
      var element = ns
        ? is
          ? getDocument(parent).createElementNS(ns, tag, { is: is })
          : getDocument(parent).createElementNS(ns, tag)
        : is
          ? getDocument(parent).createElement(tag, { is: is })
          : getDocument(parent).createElement(tag);
      vnode3.dom = element;
      if (attrs5 != null) {
        setAttrs(vnode3, attrs5, ns);
      }
      insertDOM(parent, element, nextSibling);
      if (!maybeSetContentEditable(vnode3)) {
        if (vnode3.children != null) {
          var children2 = vnode3.children;
          createNodes(element, children2, 0, children2.length, hooks, null, ns);
          if (vnode3.tag === 'select' && attrs5 != null) setLateSelectAttrs(vnode3, attrs5);
        }
      }
    }
    function initComponent(vnode3, hooks) {
      var sentinel;
      if (typeof vnode3.tag.view === 'function') {
        vnode3.state = Object.create(vnode3.tag);
        sentinel = vnode3.state.view;
        if (sentinel.$$reentrantLock$$ != null) return;
        sentinel.$$reentrantLock$$ = true;
      } else {
        vnode3.state = void 0;
        sentinel = vnode3.tag;
        if (sentinel.$$reentrantLock$$ != null) return;
        sentinel.$$reentrantLock$$ = true;
        vnode3.state =
          vnode3.tag.prototype != null && typeof vnode3.tag.prototype.view === 'function'
            ? new vnode3.tag(vnode3)
            : vnode3.tag(vnode3);
      }
      initLifecycle(vnode3.state, vnode3, hooks);
      if (vnode3.attrs != null) initLifecycle(vnode3.attrs, vnode3, hooks);
      vnode3.instance = Vnode.normalize(callHook.call(vnode3.state.view, vnode3));
      if (vnode3.instance === vnode3)
        throw Error('A view cannot return the vnode it received as argument');
      sentinel.$$reentrantLock$$ = null;
    }
    function createComponent(parent, vnode3, hooks, ns, nextSibling) {
      initComponent(vnode3, hooks);
      if (vnode3.instance != null) {
        createNode(parent, vnode3.instance, hooks, ns, nextSibling);
        vnode3.dom = vnode3.instance.dom;
        vnode3.domSize = vnode3.instance.domSize;
      } else {
        vnode3.domSize = 0;
      }
    }
    //update
    /**
     * @param {Element|Fragment} parent - the parent element
     * @param {Vnode[] | null} old - the list of vnodes of the last `render()` call for
     *                               this part of the tree
     * @param {Vnode[] | null} vnodes - as above, but for the current `render()` call.
     * @param {Function[]} hooks - an accumulator of post-render hooks (oncreate/onupdate)
     * @param {Element | null} nextSibling - the next DOM node if we're dealing with a
     *                                       fragment that is not the last item in its
     *                                       parent
     * @param {'svg' | 'math' | String | null} ns) - the current XML namespace, if any
     * @returns void
     */
    // This function diffs and patches lists of vnodes, both keyed and unkeyed.
    //
    // We will:
    //
    // 1. describe its general structure
    // 2. focus on the diff algorithm optimizations
    // 3. discuss DOM node operations.
    // ## Overview:
    //
    // The updateNodes() function:
    // - deals with trivial cases
    // - determines whether the lists are keyed or unkeyed based on the first non-null node
    //   of each list.
    // - diffs them and patches the DOM if needed (that's the brunt of the code)
    // - manages the leftovers: after diffing, are there:
    //   - old nodes left to remove?
    // 	 - new nodes to insert?
    // 	 deal with them!
    //
    // The lists are only iterated over once, with an exception for the nodes in `old` that
    // are visited in the fourth part of the diff and in the `removeNodes` loop.
    // ## Diffing
    //
    // Reading https://github.com/localvoid/ivi/blob/ddc09d06abaef45248e6133f7040d00d3c6be853/packages/ivi/src/vdom/implementation.ts#L617-L837
    // may be good for context on longest increasing subsequence-based logic for moving nodes.
    //
    // In order to diff keyed lists, one has to
    //
    // 1) match nodes in both lists, per key, and update them accordingly
    // 2) create the nodes present in the new list, but absent in the old one
    // 3) remove the nodes present in the old list, but absent in the new one
    // 4) figure out what nodes in 1) to move in order to minimize the DOM operations.
    //
    // To achieve 1) one can create a dictionary of keys => index (for the old list), then iterate
    // over the new list and for each new vnode, find the corresponding vnode in the old list using
    // the map.
    // 2) is achieved in the same step: if a new node has no corresponding entry in the map, it is new
    // and must be created.
    // For the removals, we actually remove the nodes that have been updated from the old list.
    // The nodes that remain in that list after 1) and 2) have been performed can be safely removed.
    // The fourth step is a bit more complex and relies on the longest increasing subsequence (LIS)
    // algorithm.
    //
    // the longest increasing subsequence is the list of nodes that can remain in place. Imagine going
    // from `1,2,3,4,5` to `4,5,1,2,3` where the numbers are not necessarily the keys, but the indices
    // corresponding to the keyed nodes in the old list (keyed nodes `e,d,c,b,a` => `b,a,e,d,c` would
    //  match the above lists, for example).
    //
    // In there are two increasing subsequences: `4,5` and `1,2,3`, the latter being the longest. We
    // can update those nodes without moving them, and only call `insertNode` on `4` and `5`.
    //
    // @localvoid adapted the algo to also support node deletions and insertions (the `lis` is actually
    // the longest increasing subsequence *of old nodes still present in the new list*).
    //
    // It is a general algorithm that is fireproof in all circumstances, but it requires the allocation
    // and the construction of a `key => oldIndex` map, and three arrays (one with `newIndex => oldIndex`,
    // the `LIS` and a temporary one to create the LIS).
    //
    // So we cheat where we can: if the tails of the lists are identical, they are guaranteed to be part of
    // the LIS and can be updated without moving them.
    //
    // If two nodes are swapped, they are guaranteed not to be part of the LIS, and must be moved (with
    // the exception of the last node if the list is fully reversed).
    //
    // ## Finding the next sibling.
    //
    // `updateNode()` and `createNode()` expect a nextSibling parameter to perform DOM operations.
    // When the list is being traversed top-down, at any index, the DOM nodes up to the previous
    // vnode reflect the content of the new list, whereas the rest of the DOM nodes reflect the old
    // list. The next sibling must be looked for in the old list using `getNextSibling(... oldStart + 1 ...)`.
    //
    // In the other scenarios (swaps, upwards traversal, map-based diff),
    // the new vnodes list is traversed upwards. The DOM nodes at the bottom of the list reflect the
    // bottom part of the new vnodes list, and we can use the `v.dom`  value of the previous node
    // as the next sibling (cached in the `nextSibling` variable).
    // ## DOM node moves
    //
    // In most scenarios `updateNode()` and `createNode()` perform the DOM operations. However,
    // this is not the case if the node moved (second and fourth part of the diff algo). We move
    // the old DOM nodes before updateNode runs because it enables us to use the cached `nextSibling`
    // variable rather than fetching it using `getNextSibling()`.
    function updateNodes(parent, old, vnodes, hooks, nextSibling, ns) {
      if (old === vnodes || (old == null && vnodes == null)) return;
      else if (old == null || old.length === 0)
        createNodes(parent, vnodes, 0, vnodes.length, hooks, nextSibling, ns);
      else if (vnodes == null || vnodes.length === 0) removeNodes(parent, old, 0, old.length);
      else {
        var isOldKeyed = old[0] != null && old[0].key != null;
        var isKeyed = vnodes[0] != null && vnodes[0].key != null;
        var start = 0,
          oldStart = 0;
        if (!isOldKeyed) while (oldStart < old.length && old[oldStart] == null) oldStart++;
        if (!isKeyed) while (start < vnodes.length && vnodes[start] == null) start++;
        if (isOldKeyed !== isKeyed) {
          removeNodes(parent, old, oldStart, old.length);
          createNodes(parent, vnodes, start, vnodes.length, hooks, nextSibling, ns);
        } else if (!isKeyed) {
          // Don't index past the end of either list (causes deopts).
          var commonLength = old.length < vnodes.length ? old.length : vnodes.length;
          // Rewind if necessary to the first non-null index on either side.
          // We could alternatively either explicitly create or remove nodes when `start !== oldStart`
          // but that would be optimizing for sparse lists which are more rare than dense ones.
          start = start < oldStart ? start : oldStart;
          for (; start < commonLength; start++) {
            o = old[start];
            v = vnodes[start];
            if (o === v || (o == null && v == null)) continue;
            else if (o == null)
              createNode(parent, v, hooks, ns, getNextSibling(old, start + 1, nextSibling));
            else if (v == null) removeNode(parent, o);
            else updateNode(parent, o, v, hooks, getNextSibling(old, start + 1, nextSibling), ns);
          }
          if (old.length > commonLength) removeNodes(parent, old, start, old.length);
          if (vnodes.length > commonLength)
            createNodes(parent, vnodes, start, vnodes.length, hooks, nextSibling, ns);
        } else {
          // keyed diff
          var oldEnd = old.length - 1,
            end = vnodes.length - 1,
            map,
            o,
            v,
            oe,
            ve,
            topSibling;
          // bottom-up
          while (oldEnd >= oldStart && end >= start) {
            oe = old[oldEnd];
            ve = vnodes[end];
            if (oe.key !== ve.key) break;
            if (oe !== ve) updateNode(parent, oe, ve, hooks, nextSibling, ns);
            if (ve.dom != null) nextSibling = ve.dom;
            (oldEnd--, end--);
          }
          // top-down
          while (oldEnd >= oldStart && end >= start) {
            o = old[oldStart];
            v = vnodes[start];
            if (o.key !== v.key) break;
            (oldStart++, start++);
            if (o !== v)
              updateNode(parent, o, v, hooks, getNextSibling(old, oldStart, nextSibling), ns);
          }
          // swaps and list reversals
          while (oldEnd >= oldStart && end >= start) {
            if (start === end) break;
            if (o.key !== ve.key || oe.key !== v.key) break;
            topSibling = getNextSibling(old, oldStart, nextSibling);
            moveDOM(parent, oe, topSibling);
            if (oe !== v) updateNode(parent, oe, v, hooks, topSibling, ns);
            if (++start <= --end) moveDOM(parent, o, nextSibling);
            if (o !== ve) updateNode(parent, o, ve, hooks, nextSibling, ns);
            if (ve.dom != null) nextSibling = ve.dom;
            oldStart++;
            oldEnd--;
            oe = old[oldEnd];
            ve = vnodes[end];
            o = old[oldStart];
            v = vnodes[start];
          }
          // bottom up once again
          while (oldEnd >= oldStart && end >= start) {
            if (oe.key !== ve.key) break;
            if (oe !== ve) updateNode(parent, oe, ve, hooks, nextSibling, ns);
            if (ve.dom != null) nextSibling = ve.dom;
            (oldEnd--, end--);
            oe = old[oldEnd];
            ve = vnodes[end];
          }
          if (start > end) removeNodes(parent, old, oldStart, oldEnd + 1);
          else if (oldStart > oldEnd)
            createNodes(parent, vnodes, start, end + 1, hooks, nextSibling, ns);
          else {
            // inspired by ivi https://github.com/ivijs/ivi/ by Boris Kaul
            var originalNextSibling = nextSibling,
              vnodesLength = end - start + 1,
              oldIndices = new Array(vnodesLength),
              li = 0,
              i = 0,
              pos = 2147483647,
              matched = 0,
              map,
              lisIndices;
            for (i = 0; i < vnodesLength; i++) oldIndices[i] = -1;
            for (i = end; i >= start; i--) {
              if (map == null) map = getKeyMap(old, oldStart, oldEnd + 1);
              ve = vnodes[i];
              var oldIndex = map[ve.key];
              if (oldIndex != null) {
                pos = oldIndex < pos ? oldIndex : -1; // becomes -1 if nodes were re-ordered
                oldIndices[i - start] = oldIndex;
                oe = old[oldIndex];
                old[oldIndex] = null;
                if (oe !== ve) updateNode(parent, oe, ve, hooks, nextSibling, ns);
                if (ve.dom != null) nextSibling = ve.dom;
                matched++;
              }
            }
            nextSibling = originalNextSibling;
            if (matched !== oldEnd - oldStart + 1) removeNodes(parent, old, oldStart, oldEnd + 1);
            if (matched === 0) createNodes(parent, vnodes, start, end + 1, hooks, nextSibling, ns);
            else {
              if (pos === -1) {
                // the indices of the indices of the items that are part of the
                // longest increasing subsequence in the oldIndices list
                lisIndices = makeLisIndices(oldIndices);
                li = lisIndices.length - 1;
                for (i = end; i >= start; i--) {
                  v = vnodes[i];
                  if (oldIndices[i - start] === -1) createNode(parent, v, hooks, ns, nextSibling);
                  else {
                    if (lisIndices[li] === i - start) li--;
                    else moveDOM(parent, v, nextSibling);
                  }
                  if (v.dom != null) nextSibling = vnodes[i].dom;
                }
              } else {
                for (i = end; i >= start; i--) {
                  v = vnodes[i];
                  if (oldIndices[i - start] === -1) createNode(parent, v, hooks, ns, nextSibling);
                  if (v.dom != null) nextSibling = vnodes[i].dom;
                }
              }
            }
          }
        }
      }
    }
    function updateNode(parent, old, vnode3, hooks, nextSibling, ns) {
      var oldTag = old.tag,
        tag = vnode3.tag;
      if (oldTag === tag && old.is === vnode3.is) {
        vnode3.state = old.state;
        vnode3.events = old.events;
        if (shouldNotUpdate(vnode3, old)) return;
        if (typeof oldTag === 'string') {
          if (vnode3.attrs != null) {
            updateLifecycle(vnode3.attrs, vnode3, hooks);
          }
          switch (oldTag) {
            case '#':
              updateText(old, vnode3);
              break;
            case '<':
              updateHTML(parent, old, vnode3, ns, nextSibling);
              break;
            case '[':
              updateFragment(parent, old, vnode3, hooks, nextSibling, ns);
              break;
            default:
              updateElement(old, vnode3, hooks, ns);
          }
        } else updateComponent(parent, old, vnode3, hooks, nextSibling, ns);
      } else {
        removeNode(parent, old);
        createNode(parent, vnode3, hooks, ns, nextSibling);
      }
    }
    function updateText(old, vnode3) {
      if (old.children.toString() !== vnode3.children.toString()) {
        old.dom.nodeValue = vnode3.children;
      }
      vnode3.dom = old.dom;
    }
    function updateHTML(parent, old, vnode3, ns, nextSibling) {
      if (old.children !== vnode3.children) {
        removeDOM(parent, old);
        createHTML(parent, vnode3, ns, nextSibling);
      } else {
        vnode3.dom = old.dom;
        vnode3.domSize = old.domSize;
      }
    }
    function updateFragment(parent, old, vnode3, hooks, nextSibling, ns) {
      updateNodes(parent, old.children, vnode3.children, hooks, nextSibling, ns);
      var domSize = 0,
        children2 = vnode3.children;
      vnode3.dom = null;
      if (children2 != null) {
        for (var i = 0; i < children2.length; i++) {
          var child = children2[i];
          if (child != null && child.dom != null) {
            if (vnode3.dom == null) vnode3.dom = child.dom;
            domSize += child.domSize || 1;
          }
        }
      }
      vnode3.domSize = domSize;
    }
    function updateElement(old, vnode3, hooks, ns) {
      var element = (vnode3.dom = old.dom);
      ns = getNameSpace(vnode3) || ns;
      if (
        old.attrs != vnode3.attrs ||
        (vnode3.attrs != null && !cachedAttrsIsStaticMap.get(vnode3.attrs))
      ) {
        updateAttrs(vnode3, old.attrs, vnode3.attrs, ns);
      }
      if (!maybeSetContentEditable(vnode3)) {
        updateNodes(element, old.children, vnode3.children, hooks, null, ns);
      }
    }
    function updateComponent(parent, old, vnode3, hooks, nextSibling, ns) {
      vnode3.instance = Vnode.normalize(callHook.call(vnode3.state.view, vnode3));
      if (vnode3.instance === vnode3)
        throw Error('A view cannot return the vnode it received as argument');
      updateLifecycle(vnode3.state, vnode3, hooks);
      if (vnode3.attrs != null) updateLifecycle(vnode3.attrs, vnode3, hooks);
      if (vnode3.instance != null) {
        if (old.instance == null) createNode(parent, vnode3.instance, hooks, ns, nextSibling);
        else updateNode(parent, old.instance, vnode3.instance, hooks, nextSibling, ns);
        vnode3.dom = vnode3.instance.dom;
        vnode3.domSize = vnode3.instance.domSize;
      } else {
        if (old.instance != null) removeNode(parent, old.instance);
        vnode3.domSize = 0;
      }
    }
    function getKeyMap(vnodes, start, end) {
      var map = Object.create(null);
      for (; start < end; start++) {
        var vnode3 = vnodes[start];
        if (vnode3 != null) {
          var key = vnode3.key;
          if (key != null) map[key] = start;
        }
      }
      return map;
    }
    // Lifted from ivi https://github.com/ivijs/ivi/
    // takes a list of unique numbers (-1 is special and can
    // occur multiple times) and returns an array with the indices
    // of the items that are part of the longest increasing
    // subsequence
    var lisTemp = [];
    function makeLisIndices(a) {
      var result = [0];
      var u = 0,
        v = 0,
        i = 0;
      var il = (lisTemp.length = a.length);
      for (var i = 0; i < il; i++) lisTemp[i] = a[i];
      for (var i = 0; i < il; ++i) {
        if (a[i] === -1) continue;
        var j = result[result.length - 1];
        if (a[j] < a[i]) {
          lisTemp[i] = j;
          result.push(i);
          continue;
        }
        u = 0;
        v = result.length - 1;
        while (u < v) {
          // Fast integer average without overflow.
          // eslint-disable-next-line no-bitwise
          var c = (u >>> 1) + (v >>> 1) + (u & v & 1);
          if (a[result[c]] < a[i]) {
            u = c + 1;
          } else {
            v = c;
          }
        }
        if (a[i] < a[result[u]]) {
          if (u > 0) lisTemp[i] = result[u - 1];
          result[u] = i;
        }
      }
      u = result.length;
      v = result[u - 1];
      while (u-- > 0) {
        result[u] = v;
        v = lisTemp[v];
      }
      lisTemp.length = 0;
      return result;
    }
    function getNextSibling(vnodes, i, nextSibling) {
      for (; i < vnodes.length; i++) {
        if (vnodes[i] != null && vnodes[i].dom != null) return vnodes[i].dom;
      }
      return nextSibling;
    }
    // This handles fragments with zombie children (removed from vdom, but persisted in DOM through onbeforeremove)
    function moveDOM(parent, vnode3, nextSibling) {
      if (vnode3.dom != null) {
        var target;
        if (vnode3.domSize == null || vnode3.domSize === 1) {
          // don't allocate for the common case
          target = vnode3.dom;
        } else {
          target = getDocument(parent).createDocumentFragment();
          for (var dom of domFor(vnode3)) target.appendChild(dom);
        }
        insertDOM(parent, target, nextSibling);
      }
    }
    function insertDOM(parent, dom, nextSibling) {
      if (nextSibling != null) parent.insertBefore(dom, nextSibling);
      else parent.appendChild(dom);
    }
    function maybeSetContentEditable(vnode3) {
      if (
        vnode3.attrs == null ||
        (vnode3.attrs.contenteditable == null && // attribute
          vnode3.attrs.contentEditable == null) // property
      )
        return false;
      var children2 = vnode3.children;
      if (children2 != null && children2.length === 1 && children2[0].tag === '<') {
        var content = children2[0].children;
        if (vnode3.dom.innerHTML !== content) vnode3.dom.innerHTML = content;
      } else if (children2 != null && children2.length !== 0)
        throw new Error('Child node of a contenteditable must be trusted.');
      return true;
    }
    //remove
    function removeNodes(parent, vnodes, start, end) {
      for (var i = start; i < end; i++) {
        var vnode3 = vnodes[i];
        if (vnode3 != null) removeNode(parent, vnode3);
      }
    }
    function tryBlockRemove(parent, vnode3, source, counter) {
      var original = vnode3.state;
      var result = callHook.call(source.onbeforeremove, vnode3);
      if (result == null) return;
      var generation = currentRender;
      for (var dom of domFor(vnode3)) delayedRemoval.set(dom, generation);
      counter.v++;
      Promise.resolve(result).finally(function () {
        checkState(vnode3, original);
        tryResumeRemove(parent, vnode3, counter);
      });
    }
    function tryResumeRemove(parent, vnode3, counter) {
      if (--counter.v === 0) {
        onremove(vnode3);
        removeDOM(parent, vnode3);
      }
    }
    function removeNode(parent, vnode3) {
      var counter = { v: 1 };
      if (typeof vnode3.tag !== 'string' && typeof vnode3.state.onbeforeremove === 'function')
        tryBlockRemove(parent, vnode3, vnode3.state, counter);
      if (vnode3.attrs && typeof vnode3.attrs.onbeforeremove === 'function')
        tryBlockRemove(parent, vnode3, vnode3.attrs, counter);
      tryResumeRemove(parent, vnode3, counter);
    }
    function removeDOM(parent, vnode3) {
      if (vnode3.dom == null) return;
      if (vnode3.domSize == null || vnode3.domSize === 1) {
        parent.removeChild(vnode3.dom);
      } else {
        for (var dom of domFor(vnode3)) parent.removeChild(dom);
      }
    }
    function onremove(vnode3) {
      if (typeof vnode3.tag !== 'string' && typeof vnode3.state.onremove === 'function')
        callHook.call(vnode3.state.onremove, vnode3);
      if (vnode3.attrs && typeof vnode3.attrs.onremove === 'function')
        callHook.call(vnode3.attrs.onremove, vnode3);
      if (typeof vnode3.tag !== 'string') {
        if (vnode3.instance != null) onremove(vnode3.instance);
      } else {
        if (vnode3.events != null) vnode3.events._ = null;
        var children2 = vnode3.children;
        if (Array.isArray(children2)) {
          for (var i = 0; i < children2.length; i++) {
            var child = children2[i];
            if (child != null) onremove(child);
          }
        }
      }
    }
    //attrs
    function setAttrs(vnode3, attrs5, ns) {
      for (var key in attrs5) {
        setAttr(vnode3, key, null, attrs5[key], ns);
      }
    }
    function setAttr(vnode3, key, old, value, ns) {
      if (
        key === 'key' ||
        value == null ||
        isLifecycleMethod(key) ||
        (old === value && !isFormAttribute(vnode3, key) && typeof value !== 'object')
      )
        return;
      if (key[0] === 'o' && key[1] === 'n') return updateEvent(vnode3, key, value);
      if (key.slice(0, 6) === 'xlink:')
        vnode3.dom.setAttributeNS('http://www.w3.org/1999/xlink', key.slice(6), value);
      else if (key === 'style') updateStyle(vnode3.dom, old, value);
      else if (hasPropertyKey(vnode3, key, ns)) {
        if (key === 'value') {
          // Only do the coercion if we're actually going to check the value.
          /* eslint-disable no-implicit-coercion */
          //setting input[value] to same value by typing on focused element moves cursor to end in Chrome
          //setting input[type=file][value] to same value causes an error to be generated if it's non-empty
          //minlength/maxlength validation isn't performed on script-set values(#2256)
          if (
            (vnode3.tag === 'input' || vnode3.tag === 'textarea') &&
            vnode3.dom.value === '' + value
          )
            return;
          //setting select[value] to same value while having select open blinks select dropdown in Chrome
          if (vnode3.tag === 'select' && old !== null && vnode3.dom.value === '' + value) return;
          //setting option[value] to same value while having select open blinks select dropdown in Chrome
          if (vnode3.tag === 'option' && old !== null && vnode3.dom.value === '' + value) return;
          //setting input[type=file][value] to different value is an error if it's non-empty
          // Not ideal, but it at least works around the most common source of uncaught exceptions for now.
          if (vnode3.tag === 'input' && vnode3.attrs.type === 'file' && '' + value !== '') {
            console.error('`value` is read-only on file inputs!');
            return;
          }
          /* eslint-enable no-implicit-coercion */
        }
        // If you assign an input type that is not supported by IE 11 with an assignment expression, an error will occur.
        if (vnode3.tag === 'input' && key === 'type') vnode3.dom.setAttribute(key, value);
        else vnode3.dom[key] = value;
      } else {
        if (typeof value === 'boolean') {
          if (value) vnode3.dom.setAttribute(key, '');
          else vnode3.dom.removeAttribute(key);
        } else vnode3.dom.setAttribute(key === 'className' ? 'class' : key, value);
      }
    }
    function removeAttr(vnode3, key, old, ns) {
      if (key === 'key' || old == null || isLifecycleMethod(key)) return;
      if (key[0] === 'o' && key[1] === 'n') updateEvent(vnode3, key, undefined);
      else if (key === 'style') updateStyle(vnode3.dom, old, null);
      else if (
        hasPropertyKey(vnode3, key, ns) &&
        key !== 'className' &&
        key !== 'title' && // creates "null" as title
        !(
          key === 'value' &&
          (vnode3.tag === 'option' ||
            (vnode3.tag === 'select' &&
              vnode3.dom.selectedIndex === -1 &&
              vnode3.dom === activeElement(vnode3.dom)))
        ) &&
        !(vnode3.tag === 'input' && key === 'type')
      ) {
        vnode3.dom[key] = null;
      } else {
        var nsLastIndex = key.indexOf(':');
        if (nsLastIndex !== -1) key = key.slice(nsLastIndex + 1);
        if (old !== false) vnode3.dom.removeAttribute(key === 'className' ? 'class' : key);
      }
    }
    function setLateSelectAttrs(vnode3, attrs5) {
      if ('value' in attrs5) {
        if (attrs5.value === null) {
          if (vnode3.dom.selectedIndex !== -1) vnode3.dom.value = null;
        } else {
          var normalized = '' + attrs5.value; // eslint-disable-line no-implicit-coercion
          if (vnode3.dom.value !== normalized || vnode3.dom.selectedIndex === -1) {
            vnode3.dom.value = normalized;
          }
        }
      }
      if ('selectedIndex' in attrs5)
        setAttr(vnode3, 'selectedIndex', null, attrs5.selectedIndex, undefined);
    }
    function updateAttrs(vnode3, old, attrs5, ns) {
      // Some attributes may NOT be case-sensitive (e.g. data-***),
      // so removal should be done first to prevent accidental removal for newly setting values.
      var val;
      if (old != null) {
        if (old === attrs5 && !cachedAttrsIsStaticMap.has(attrs5)) {
          console.warn(
            "Don't reuse attrs object, use new object for every redraw, this will throw in next major"
          );
        }
        for (var key in old) {
          if ((val = old[key]) != null && (attrs5 == null || attrs5[key] == null)) {
            removeAttr(vnode3, key, val, ns);
          }
        }
      }
      if (attrs5 != null) {
        for (var key in attrs5) {
          setAttr(vnode3, key, old && old[key], attrs5[key], ns);
        }
      }
    }
    function isFormAttribute(vnode3, attr) {
      return (
        attr === 'value' ||
        attr === 'checked' ||
        attr === 'selectedIndex' ||
        (attr === 'selected' &&
          (vnode3.dom === activeElement(vnode3.dom) ||
            (vnode3.tag === 'option' && vnode3.dom.parentNode === activeElement(vnode3.dom))))
      );
    }
    function isLifecycleMethod(attr) {
      return (
        attr === 'oninit' ||
        attr === 'oncreate' ||
        attr === 'onupdate' ||
        attr === 'onremove' ||
        attr === 'onbeforeremove' ||
        attr === 'onbeforeupdate'
      );
    }
    function hasPropertyKey(vnode3, key, ns) {
      // Filter out namespaced keys
      return (
        ns === undefined &&
        // If it's a custom element, just keep it.
        (vnode3.tag.indexOf('-') > -1 ||
          vnode3.is ||
          // If it's a normal element, let's try to avoid a few browser bugs.
          (key !== 'href' &&
            key !== 'list' &&
            key !== 'form' &&
            key !== 'width' &&
            key !== 'height')) && // && key !== "type"
        // Defer the property check until *after* we check everything.
        key in vnode3.dom
      );
    }
    //style
    function updateStyle(element, old, style) {
      if (old === style) {
        // Styles are equivalent, do nothing.
      } else if (style == null) {
        // New style is missing, just clear it.
        element.style = '';
      } else if (typeof style !== 'object') {
        // New style is a string, let engine deal with patching.
        element.style = style;
      } else if (old == null || typeof old !== 'object') {
        // `old` is missing or a string, `style` is an object.
        element.style = '';
        // Add new style properties
        for (var key in style) {
          var value = style[key];
          if (value != null) {
            if (key.includes('-')) element.style.setProperty(key, String(value));
            else element.style[key] = String(value);
          }
        }
      } else {
        // Both old & new are (different) objects.
        // Remove style properties that no longer exist
        // Style properties may have two cases(dash-case and camelCase),
        // so removal should be done first to prevent accidental removal for newly setting values.
        for (var key in old) {
          if (old[key] != null && style[key] == null) {
            if (key.includes('-')) element.style.removeProperty(key);
            else element.style[key] = '';
          }
        }
        // Update style properties that have changed
        for (var key in style) {
          var value = style[key];
          if (value != null && (value = String(value)) !== String(old[key])) {
            if (key.includes('-')) element.style.setProperty(key, value);
            else element.style[key] = value;
          }
        }
      }
    }
    // Here's an explanation of how this works:
    // 1. The event names are always (by design) prefixed by `on`.
    // 2. The EventListener interface accepts either a function or an object
    //    with a `handleEvent` method.
    // 3. The object does not inherit from `Object.prototype`, to avoid
    //    any potential interference with that (e.g. setters).
    // 4. The event name is remapped to the handler before calling it.
    // 5. In function-based event handlers, `ev.target === this`. We replicate
    //    that below.
    // 6. In function-based event handlers, `return false` prevents the default
    //    action and stops event propagation. We replicate that below.
    function EventDict() {
      // Save this, so the current redraw is correctly tracked.
      this._ = currentRedraw;
    }
    EventDict.prototype = Object.create(null);
    EventDict.prototype.handleEvent = function (ev) {
      var handler = this['on' + ev.type];
      var result;
      if (typeof handler === 'function') result = handler.call(ev.currentTarget, ev);
      else if (typeof handler.handleEvent === 'function') handler.handleEvent(ev);
      var self = this;
      if (self._ != null) {
        if (ev.redraw !== false) (0, self._)();
        if (result != null && typeof result.then === 'function') {
          Promise.resolve(result).then(function () {
            if (self._ != null && ev.redraw !== false) (0, self._)();
          });
        }
      }
      if (result === false) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    };
    //event
    function updateEvent(vnode3, key, value) {
      if (vnode3.events != null) {
        vnode3.events._ = currentRedraw;
        if (vnode3.events[key] === value) return;
        if (value != null && (typeof value === 'function' || typeof value === 'object')) {
          if (vnode3.events[key] == null)
            vnode3.dom.addEventListener(key.slice(2), vnode3.events, false);
          vnode3.events[key] = value;
        } else {
          if (vnode3.events[key] != null)
            vnode3.dom.removeEventListener(key.slice(2), vnode3.events, false);
          vnode3.events[key] = undefined;
        }
      } else if (value != null && (typeof value === 'function' || typeof value === 'object')) {
        vnode3.events = new EventDict();
        vnode3.dom.addEventListener(key.slice(2), vnode3.events, false);
        vnode3.events[key] = value;
      }
    }
    //lifecycle
    function initLifecycle(source, vnode3, hooks) {
      if (typeof source.oninit === 'function') callHook.call(source.oninit, vnode3);
      if (typeof source.oncreate === 'function') hooks.push(callHook.bind(source.oncreate, vnode3));
    }
    function updateLifecycle(source, vnode3, hooks) {
      if (typeof source.onupdate === 'function') hooks.push(callHook.bind(source.onupdate, vnode3));
    }
    function shouldNotUpdate(vnode3, old) {
      if (!vnode3 || !old || !old.dom) return false;
      do {
        if (vnode3.attrs != null && typeof vnode3.attrs.onbeforeupdate === 'function') {
          var force = callHook.call(vnode3.attrs.onbeforeupdate, vnode3, old);
          if (force !== undefined && !force) break;
        }
        if (typeof vnode3.tag !== 'string' && vnode3.state && typeof vnode3.state.onbeforeupdate === 'function') {
          var force = callHook.call(vnode3.state.onbeforeupdate, vnode3, old);
          if (force !== undefined && !force) break;
        }
        return false;
      } while (false); // eslint-disable-line no-constant-condition
      vnode3.dom = old.dom;
      vnode3.domSize = old.domSize;
      vnode3.instance = old.instance;
      // One would think having the actual latest attributes would be ideal,
      // but it doesn't let us properly diff based on our current internal
      // representation. We have to save not only the old DOM info, but also
      // the attributes used to create it, as we diff *that*, not against the
      // DOM directly (with a few exceptions in `setAttr`). And, of course, we
      // need to save the children and text as they are conceptually not
      // unlike special "attributes" internally.
      vnode3.attrs = old.attrs;
      vnode3.children = old.children;
      vnode3.text = old.text;
      return true;
    }
    var currentDOM;
    return function (dom, vnodes, redraw) {
      if (!dom) throw new TypeError('DOM element being rendered to does not exist.');
      if (currentDOM != null && dom.contains(currentDOM)) {
        throw new TypeError('Node is currently being rendered to and thus is locked.');
      }
      var prevRedraw = currentRedraw;
      var prevDOM = currentDOM;
      var hooks = [];
      var active = activeElement(dom);
      var namespace = dom.namespaceURI;
      currentDOM = dom;
      currentRedraw = typeof redraw === 'function' ? redraw : undefined;
      currentRender = {};
      try {
        // First time rendering into a node clears it out
        if (dom.vnodes == null) dom.textContent = '';
        vnodes = Vnode.normalizeChildren(Array.isArray(vnodes) ? vnodes : [vnodes]);
        updateNodes(
          dom,
          dom.vnodes,
          vnodes,
          hooks,
          null,
          namespace === 'http://www.w3.org/1999/xhtml' ? undefined : namespace
        );
        dom.vnodes = vnodes;
        // `document.activeElement` can return null: https://html.spec.whatwg.org/multipage/interaction.html#dom-document-activeelement
        if (active != null && activeElement(dom) !== active && typeof active.focus === 'function')
          active.focus();
        for (var i = 0; i < hooks.length; i++) hooks[i]();
      } finally {
        currentRedraw = prevRedraw;
        currentDOM = prevDOM;
      }
    };
  };
  var render = _14();
  var _21 = function (render2, schedule, console) {
    var subscriptions = [];
    var pending = false;
    var offset = -1;
    function sync() {
      for (offset = 0; offset < subscriptions.length; offset += 2) {
        try {
          render2(subscriptions[offset], Vnode(subscriptions[offset + 1]), redraw);
        } catch (e) {
          console.error(e);
        }
      }
      offset = -1;
    }
    function redraw() {
      if (!pending) {
        pending = true;
        schedule(function () {
          pending = false;
          sync();
        });
      }
    }
    redraw.sync = sync;
    function mount(root, component) {
      if (component != null && component.view == null && typeof component !== 'function') {
        throw new TypeError('m.mount expects a component, not a vnode.');
      }
      var index = subscriptions.indexOf(root);
      if (index >= 0) {
        subscriptions.splice(index, 2);
        if (index <= offset) offset -= 2;
        render2(root, []);
      }
      if (component != null) {
        subscriptions.push(root, component);
        render2(root, Vnode(component), redraw);
      }
    }
    return { mount: mount, redraw: redraw };
  };
  var mountRedraw = _21(
    render,
    typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : null,
    typeof console !== 'undefined' ? console : null
  );
  var buildQueryString = function (object) {
    if (Object.prototype.toString.call(object) !== '[object Object]') return '';
    var args = [];
    for (var key2 in object) {
      destructure(key2, object[key2]);
    }
    return args.join('&');
    function destructure(key2, value1) {
      if (Array.isArray(value1)) {
        for (var i = 0; i < value1.length; i++) {
          destructure(key2 + '[' + i + ']', value1[i]);
        }
      } else if (Object.prototype.toString.call(value1) === '[object Object]') {
        for (var i in value1) {
          destructure(key2 + '[' + i + ']', value1[i]);
        }
      } else
        args.push(
          encodeURIComponent(key2) +
            (value1 != null && value1 !== '' ? '=' + encodeURIComponent(value1) : '')
        );
    }
  };
  // Returns `path` from `template` + `params`
  var buildPathname = function (template, params) {
    if (/:([^\/\.-]+)(\.{3})?:/.test(template)) {
      throw new SyntaxError(
        "Template parameter names must be separated by either a '/', '-', or '.'."
      );
    }
    if (params == null) return template;
    var queryIndex = template.indexOf('?');
    var hashIndex = template.indexOf('#');
    var queryEnd = hashIndex < 0 ? template.length : hashIndex;
    var pathEnd = queryIndex < 0 ? queryEnd : queryIndex;
    var path = template.slice(0, pathEnd);
    var query = {};
    Object.assign(query, params);
    var resolved = path.replace(/:([^\/\.-]+)(\.{3})?/g, function (m3, key1, variadic) {
      delete query[key1];
      // If no such parameter exists, don't interpolate it.
      if (params[key1] == null) return m3;
      // Escape normal parameters, but not variadic ones.
      return variadic ? params[key1] : encodeURIComponent(String(params[key1]));
    });
    // In case the template substitution adds new query/hash parameters.
    var newQueryIndex = resolved.indexOf('?');
    var newHashIndex = resolved.indexOf('#');
    var newQueryEnd = newHashIndex < 0 ? resolved.length : newHashIndex;
    var newPathEnd = newQueryIndex < 0 ? newQueryEnd : newQueryIndex;
    var result0 = resolved.slice(0, newPathEnd);
    if (queryIndex >= 0) result0 += template.slice(queryIndex, queryEnd);
    if (newQueryIndex >= 0)
      result0 += (queryIndex < 0 ? '?' : '&') + resolved.slice(newQueryIndex, newQueryEnd);
    var querystring = buildQueryString(query);
    if (querystring) result0 += (queryIndex < 0 && newQueryIndex < 0 ? '?' : '&') + querystring;
    if (hashIndex >= 0) result0 += template.slice(hashIndex);
    if (newHashIndex >= 0) result0 += (hashIndex < 0 ? '' : '&') + resolved.slice(newHashIndex);
    return result0;
  };
  var _25 = function ($window, oncompletion) {
    function PromiseProxy(executor) {
      return new Promise(executor);
    }
    function makeRequest(url, args) {
      return new Promise(function (resolve, reject) {
        url = buildPathname(url, args.params);
        var method = args.method != null ? args.method.toUpperCase() : 'GET';
        var body = args.body;
        var assumeJSON =
          (args.serialize == null || args.serialize === JSON.serialize) &&
          !(body instanceof $window.FormData || body instanceof $window.URLSearchParams);
        var responseType = args.responseType || (typeof args.extract === 'function' ? '' : 'json');
        var xhr = new $window.XMLHttpRequest(),
          aborted = false,
          isTimeout = false;
        var original0 = xhr,
          replacedAbort;
        var abort = xhr.abort;
        xhr.abort = function () {
          aborted = true;
          abort.call(this);
        };
        xhr.open(
          method,
          url,
          args.async !== false,
          typeof args.user === 'string' ? args.user : undefined,
          typeof args.password === 'string' ? args.password : undefined
        );
        if (assumeJSON && body != null && !hasHeader(args, 'content-type')) {
          xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
        }
        if (typeof args.deserialize !== 'function' && !hasHeader(args, 'accept')) {
          xhr.setRequestHeader('Accept', 'application/json, text/*');
        }
        if (args.withCredentials) xhr.withCredentials = args.withCredentials;
        if (args.timeout) xhr.timeout = args.timeout;
        xhr.responseType = responseType;
        for (var key0 in args.headers) {
          if (hasOwn.call(args.headers, key0)) {
            xhr.setRequestHeader(key0, args.headers[key0]);
          }
        }
        xhr.onreadystatechange = function (ev) {
          // Don't throw errors on xhr.abort().
          if (aborted) return;
          if (ev.target.readyState === 4) {
            try {
              var success =
                (ev.target.status >= 200 && ev.target.status < 300) ||
                ev.target.status === 304 ||
                /^file:\/\//i.test(url);
              // When the response type isn't "" or "text",
              // `xhr.responseText` is the wrong thing to use.
              // Browsers do the right thing and throw here, and we
              // should honor that and do the right thing by
              // preferring `xhr.response` where possible/practical.
              var response = ev.target.response,
                message;
              if (responseType === 'json') {
                // For IE and Edge, which don't implement
                // `responseType: "json"`.
                if (!ev.target.responseType && typeof args.extract !== 'function') {
                  // Handle no-content which will not parse.
                  try {
                    response = JSON.parse(ev.target.responseText);
                  } catch (e) {
                    response = null;
                  }
                }
              } else if (!responseType || responseType === 'text') {
                // Only use this default if it's text. If a parsed
                // document is needed on old IE and friends (all
                // unsupported), the user should use a custom
                // `config` instead. They're already using this at
                // their own risk.
                if (response == null) response = ev.target.responseText;
              }
              if (typeof args.extract === 'function') {
                response = args.extract(ev.target, args);
                success = true;
              } else if (typeof args.deserialize === 'function') {
                response = args.deserialize(response);
              }
              if (success) {
                if (typeof args.type === 'function') {
                  if (Array.isArray(response)) {
                    for (var i = 0; i < response.length; i++) {
                      response[i] = new args.type(response[i]);
                    }
                  } else response = new args.type(response);
                }
                resolve(response);
              } else {
                var completeErrorResponse = function () {
                  try {
                    message = ev.target.responseText;
                  } catch (e) {
                    message = response;
                  }
                  var error = new Error(message);
                  error.code = ev.target.status;
                  error.response = response;
                  reject(error);
                };
                if (xhr.status === 0) {
                  // Use setTimeout to push this code block onto the event queue
                  // This allows `xhr.ontimeout` to run in the case that there is a timeout
                  // Without this setTimeout, `xhr.ontimeout` doesn't have a chance to reject
                  // as `xhr.onreadystatechange` will run before it
                  setTimeout(function () {
                    if (isTimeout) return;
                    completeErrorResponse();
                  });
                } else completeErrorResponse();
              }
            } catch (e) {
              reject(e);
            }
          }
        };
        xhr.ontimeout = function (ev) {
          isTimeout = true;
          var error = new Error('Request timed out');
          error.code = ev.target.status;
          reject(error);
        };
        if (typeof args.config === 'function') {
          xhr = args.config(xhr, args, url) || xhr;
          // Propagate the `abort` to any replacement XHR as well.
          if (xhr !== original0) {
            replacedAbort = xhr.abort;
            xhr.abort = function () {
              aborted = true;
              replacedAbort.call(this);
            };
          }
        }
        if (body == null) xhr.send();
        else if (typeof args.serialize === 'function') xhr.send(args.serialize(body));
        else if (body instanceof $window.FormData || body instanceof $window.URLSearchParams)
          xhr.send(body);
        else xhr.send(JSON.stringify(body));
      });
    }
    // In case the global Promise is some userland library's where they rely on
    // `foo instanceof this.constructor`, `this.constructor.resolve(value)`, or
    // similar. Let's *not* break them.
    PromiseProxy.prototype = Promise.prototype;
    PromiseProxy.__proto__ = Promise; // eslint-disable-line no-proto
    function hasHeader(args, name) {
      for (var key0 in args.headers) {
        if (hasOwn.call(args.headers, key0) && key0.toLowerCase() === name) return true;
      }
      return false;
    }
    return {
      request: function (url, args) {
        if (typeof url !== 'string') {
          args = url;
          url = url.url;
        } else if (args == null) args = {};
        var promise = makeRequest(url, args);
        if (args.background === true) return promise;
        var count = 0;
        function complete() {
          if (--count === 0 && typeof oncompletion === 'function') oncompletion();
        }
        return wrap(promise);
        function wrap(promise) {
          var then = promise.then;
          // Set the constructor, so engines know to not await or resolve
          // this as a native promise. At the time of writing, this is
          // only necessary for V8, but their behavior is the correct
          // behavior per spec. See this spec issue for more details:
          // https://github.com/tc39/ecma262/issues/1577. Also, see the
          // corresponding comment in `request/tests/test-request.js` for
          // a bit more background on the issue at hand.
          promise.constructor = PromiseProxy;
          promise.then = function () {
            count++;
            var next = then.apply(promise, arguments);
            next.then(complete, function (e) {
              complete();
              if (count === 0) throw e;
            });
            return wrap(next);
          };
          return promise;
        }
      },
    };
  };
  var request = _25(typeof window !== 'undefined' ? window : null, mountRedraw.redraw);
  /*
Percent encodings encode UTF-8 bytes, so this regexp needs to match that.
Here's how UTF-8 encodes stuff:
- `00-7F`: 1-byte, for U+0000-U+007F
- `C2-DF 80-BF`: 2-byte, for U+0080-U+07FF
- `E0-EF 80-BF 80-BF`: 3-byte, encodes U+0800-U+FFFF
- `F0-F4 80-BF 80-BF 80-BF`: 4-byte, encodes U+10000-U+10FFFF
In this, there's a number of invalid byte sequences:
- `80-BF`: Continuation byte, invalid as start
- `C0-C1 80-BF`: Overlong encoding for U+0000-U+007F
- `E0 80-9F 80-BF`: Overlong encoding for U+0080-U+07FF
- `ED A0-BF 80-BF`: Encoding for UTF-16 surrogate U+D800-U+DFFF
- `F0 80-8F 80-BF 80-BF`: Overlong encoding for U+0800-U+FFFF
- `F4 90-BF`: RFC 3629 restricted UTF-8 to only code points UTF-16 could encode.
- `F5-FF`: RFC 3629 restricted UTF-8 to only code points UTF-16 could encode.
So in reality, only the following sequences can encode are valid characters:
- 00-7F
- C2-DF 80-BF
- E0    A0-BF 80-BF
- E1-EC 80-BF 80-BF
- ED    80-9F 80-BF
- EE-EF 80-BF 80-BF
- F0    90-BF 80-BF 80-BF
- F1-F3 80-BF 80-BF 80-BF
- F4    80-8F 80-BF 80-BF
The regexp just tries to match this as compactly as possible.
*/
  var validUtf8Encodings =
    /%(?:[0-7]|(?!c[01]|e0%[89]|ed%[ab]|f0%8|f4%[9ab])(?:c|d|(?:e|f[0-4]%[89ab])[\da-f]%[89ab])[\da-f]%[89ab])[\da-f]/gi;
  var decodeURIComponentSafe = function (str) {
    return String(str).replace(validUtf8Encodings, decodeURIComponent);
  };
  var parseQueryString = function (string) {
    if (string === '' || string == null) return {};
    if (string.charAt(0) === '?') string = string.slice(1);
    var entries = string.split('&'),
      counters = {},
      data0 = {};
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i].split('=');
      var key4 = decodeURIComponentSafe(entry[0]);
      var value2 = entry.length === 2 ? decodeURIComponentSafe(entry[1]) : '';
      if (value2 === 'true') value2 = true;
      else if (value2 === 'false') value2 = false;
      var levels = key4.split(/\]\[?|\[/);
      var cursor = data0;
      if (key4.indexOf('[') > -1) levels.pop();
      for (var j0 = 0; j0 < levels.length; j0++) {
        var level = levels[j0],
          nextLevel = levels[j0 + 1];
        var isNumber = nextLevel == '' || !isNaN(parseInt(nextLevel, 10));
        if (level === '') {
          var key4 = levels.slice(0, j0).join();
          if (counters[key4] == null) {
            counters[key4] = Array.isArray(cursor) ? cursor.length : 0;
          }
          level = counters[key4]++;
        }
        // Disallow direct prototype pollution
        else if (level === '__proto__') break;
        if (j0 === levels.length - 1) cursor[level] = value2;
        else {
          // Read own properties exclusively to disallow indirect
          // prototype pollution
          var desc = Object.getOwnPropertyDescriptor(cursor, level);
          if (desc != null) desc = desc.value;
          if (desc == null) cursor[level] = desc = isNumber ? [] : {};
          cursor = desc;
        }
      }
    }
    return data0;
  };
  // Returns `{path, params}` from `url`
  var parsePathname = function (url) {
    var queryIndex0 = url.indexOf('?');
    var hashIndex0 = url.indexOf('#');
    var queryEnd0 = hashIndex0 < 0 ? url.length : hashIndex0;
    var pathEnd0 = queryIndex0 < 0 ? queryEnd0 : queryIndex0;
    var path1 = url.slice(0, pathEnd0).replace(/\/{2,}/g, '/');
    if (!path1) path1 = '/';
    else {
      if (path1[0] !== '/') path1 = '/' + path1;
    }
    return {
      path: path1,
      params: queryIndex0 < 0 ? {} : parseQueryString(url.slice(queryIndex0 + 1, queryEnd0)),
    };
  };
  // Compiles a template into a function that takes a resolved path (without query
  // strings) and returns an object containing the template parameters with their
  // parsed values. This expects the input of the compiled template to be the
  // output of `parsePathname`. Note that it does *not* remove query parameters
  // specified in the template.
  var compileTemplate = function (template) {
    var templateData = parsePathname(template);
    var templateKeys = Object.keys(templateData.params);
    var keys = [];
    var regexp = new RegExp(
      '^' +
        templateData.path.replace(
          // I escape literal text so people can use things like `:file.:ext` or
          // `:lang-:locale` in routes. This is all merged into one pass so I
          // don't also accidentally escape `-` and make it harder to detect it to
          // ban it from template parameters.
          /:([^\/.-]+)(\.{3}|\.(?!\.)|-)?|[\\^$*+.()|\[\]{}]/g,
          function (m4, key5, extra) {
            if (key5 == null) return '\\' + m4;
            keys.push({ k: key5, r: extra === '...' });
            if (extra === '...') return '(.*)';
            if (extra === '.') return '([^/]+)\\.';
            return '([^/]+)' + (extra || '');
          }
        ) +
        '\\/?$'
    );
    return function (data1) {
      // First, check the params. Usually, there isn't any, and it's just
      // checking a static set.
      for (var i = 0; i < templateKeys.length; i++) {
        if (templateData.params[templateKeys[i]] !== data1.params[templateKeys[i]]) return false;
      }
      // If no interpolations exist, let's skip all the ceremony
      if (!keys.length) return regexp.test(data1.path);
      var values = regexp.exec(data1.path);
      if (values == null) return false;
      for (var i = 0; i < keys.length; i++) {
        data1.params[keys[i].k] = keys[i].r ? values[i + 1] : decodeURIComponent(values[i + 1]);
      }
      return true;
    };
  };
  // Note: this is mildly perf-sensitive.
  //
  // It does *not* use `delete` - dynamic `delete`s usually cause objects to bail
  // out into dictionary mode and just generally cause a bunch of optimization
  // issues within engines.
  //
  // Ideally, I would've preferred to do this, if it weren't for the optimization
  // issues:
  //
  // ```js
  // const hasOwn = hasOwn
  // const magic = [
  //     "key", "oninit", "oncreate", "onbeforeupdate", "onupdate",
  //     "onbeforeremove", "onremove",
  // ]
  // var censor = (attrs, extras) => {
  //     const result = Object.assign(Object.create(null), attrs)
  //     for (const key of magic) delete result[key]
  //     if (extras != null) for (const key of extras) delete result[key]
  //     return result
  // }
  // ```
  var magic = /^(?:key|oninit|oncreate|onbeforeupdate|onupdate|onbeforeremove|onremove)$/;
  var censor = function (attrs7, extras) {
    var result2 = {};
    if (extras != null) {
      for (var key6 in attrs7) {
        if (hasOwn.call(attrs7, key6) && !magic.test(key6) && extras.indexOf(key6) < 0) {
          result2[key6] = attrs7[key6];
        }
      }
    } else {
      for (var key6 in attrs7) {
        if (hasOwn.call(attrs7, key6) && !magic.test(key6)) {
          result2[key6] = attrs7[key6];
        }
      }
    }
    return result2;
  };
  var _31 = function ($window, mountRedraw0) {
    var p = Promise.resolve();
    var scheduled = false;
    var ready = false;
    var hasBeenResolved = false;
    var dom0, compiled, fallbackRoute;
    var currentResolver, component, attrs6, currentPath, lastUpdate;
    var RouterRoot = {
      onremove: function () {
        ready = hasBeenResolved = false;
        $window.removeEventListener('popstate', fireAsync, false);
      },
      view: function () {
        // The route has already been resolved.
        // Therefore, the following early return is not needed.
        // if (!hasBeenResolved) return
        var vnode6 = Vnode(component, attrs6.key, attrs6);
        if (currentResolver) return currentResolver.render(vnode6);
        // Wrap in a fragment to preserve existing key semantics
        return [vnode6];
      },
    };
    var SKIP = (route.SKIP = {});
    function resolveRoute() {
      scheduled = false;
      // Consider the pathname holistically. The prefix might even be invalid,
      // but that's not our problem.
      var prefix = $window.location.hash;
      if (route.prefix[0] !== '#') {
        prefix = $window.location.search + prefix;
        if (route.prefix[0] !== '?') {
          prefix = $window.location.pathname + prefix;
          if (prefix[0] !== '/') prefix = '/' + prefix;
        }
      }
      var path0 = decodeURIComponentSafe(prefix).slice(route.prefix.length);
      var data = parsePathname(path0);
      Object.assign(data.params, $window.history.state);
      function reject(e) {
        console.error(e);
        route.set(fallbackRoute, null, { replace: true });
      }
      loop(0);
      function loop(i) {
        for (; i < compiled.length; i++) {
          if (compiled[i].check(data)) {
            var payload = compiled[i].component;
            var matchedRoute = compiled[i].route;
            var localComp = payload;
            var update = (lastUpdate = function (comp) {
              if (update !== lastUpdate) return;
              if (comp === SKIP) return loop(i + 1);
              component =
                comp != null && (typeof comp.view === 'function' || typeof comp === 'function')
                  ? comp
                  : 'div';
              ((attrs6 = data.params), (currentPath = path0), (lastUpdate = null));
              currentResolver = payload.render ? payload : null;
              if (hasBeenResolved) mountRedraw0.redraw();
              else {
                hasBeenResolved = true;
                mountRedraw0.mount(dom0, RouterRoot);
              }
            });
            // There's no understating how much I *wish* I could
            // use `async`/`await` here...
            if (payload.view || typeof payload === 'function') {
              payload = {};
              update(localComp);
            } else if (payload.onmatch) {
              p.then(function () {
                return payload.onmatch(data.params, path0, matchedRoute);
              }).then(update, path0 === fallbackRoute ? null : reject);
            } else update(/* "div" */);
            return;
          }
        }
        if (path0 === fallbackRoute) {
          throw new Error('Could not resolve default route ' + fallbackRoute + '.');
        }
        route.set(fallbackRoute, null, { replace: true });
      }
    }
    function fireAsync() {
      if (!scheduled) {
        scheduled = true;
        // TODO: just do `mountRedraw.redraw()` here and elide the timer
        // dependency. Note that this will muck with tests a *lot*, so it's
        // not as easy of a change as it sounds.
        setTimeout(resolveRoute);
      }
    }
    function route(root, defaultRoute, routes) {
      if (!root) throw new TypeError('DOM element being rendered to does not exist.');
      compiled = Object.keys(routes).map(function (route) {
        if (route[0] !== '/') throw new SyntaxError("Routes must start with a '/'.");
        if (/:([^\/\.-]+)(\.{3})?:/.test(route)) {
          throw new SyntaxError(
            "Route parameter names must be separated with either '/', '.', or '-'."
          );
        }
        return {
          route: route,
          component: routes[route],
          check: compileTemplate(route),
        };
      });
      fallbackRoute = defaultRoute;
      if (defaultRoute != null) {
        var defaultData = parsePathname(defaultRoute);
        if (
          !compiled.some(function (i) {
            return i.check(defaultData);
          })
        ) {
          throw new ReferenceError("Default route doesn't match any known routes.");
        }
      }
      dom0 = root;
      $window.addEventListener('popstate', fireAsync, false);
      ready = true;
      // The RouterRoot component is mounted when the route is first resolved.
      resolveRoute();
    }
    route.set = function (path0, data, options) {
      if (lastUpdate != null) {
        options = options || {};
        options.replace = true;
      }
      lastUpdate = null;
      path0 = buildPathname(path0, data);
      if (ready) {
        fireAsync();
        var state = options ? options.state : null;
        var title = options ? options.title : null;
        if (options && options.replace)
          $window.history.replaceState(state, title, route.prefix + path0);
        else $window.history.pushState(state, title, route.prefix + path0);
      } else {
        $window.location.href = route.prefix + path0;
      }
    };
    route.get = function () {
      return currentPath;
    };
    route.prefix = '#!';
    route.Link = {
      view: function (vnode6) {
        // Omit the used parameters from the rendered element - they are
        // internal. Also, censor the various lifecycle methods.
        //
        // We don't strip the other parameters because for convenience we
        // let them be specified in the selector as well.
        var child0 = hyperscript(
          vnode6.attrs.selector || 'a',
          censor(vnode6.attrs, ['options', 'params', 'selector', 'onclick']),
          vnode6.children
        );
        var options, onclick, href;
        // Let's provide a *right* way to disable a route link, rather than
        // letting people screw up accessibility on accident.
        //
        // The attribute is coerced so users don't get surprised over
        // `disabled: 0` resulting in a button that's somehow routable
        // despite being visibly disabled.
        if ((child0.attrs.disabled = Boolean(child0.attrs.disabled))) {
          child0.attrs.href = null;
          child0.attrs['aria-disabled'] = 'true';
          // If you *really* do want add `onclick` on a disabled link, use
          // an `oncreate` hook to add it.
        } else {
          options = vnode6.attrs.options;
          onclick = vnode6.attrs.onclick;
          // Easier to build it now to keep it isomorphic.
          href = buildPathname(child0.attrs.href, vnode6.attrs.params);
          child0.attrs.href = route.prefix + href;
          child0.attrs.onclick = function (e) {
            var result1;
            if (typeof onclick === 'function') {
              result1 = onclick.call(e.currentTarget, e);
            } else if (onclick == null || typeof onclick !== 'object') {
              // do nothing
            } else if (typeof onclick.handleEvent === 'function') {
              onclick.handleEvent(e);
            }
            // Adapted from React Router's implementation:
            // https://github.com/ReactTraining/react-router/blob/520a0acd48ae1b066eb0b07d6d4d1790a1d02482/packages/react-router-dom/modules/Link.js
            //
            // Try to be flexible and intuitive in how we handle links.
            // Fun fact: links aren't as obvious to get right as you
            // would expect. There's a lot more valid ways to click a
            // link than this, and one might want to not simply click a
            // link, but right click or command-click it to copy the
            // link target, etc. Nope, this isn't just for blind people.
            if (
              // Skip if `onclick` prevented default
              result1 !== false &&
              !e.defaultPrevented &&
              // Ignore everything but left clicks
              (e.button === 0 || e.which === 0 || e.which === 1) &&
              // Let the browser handle `target=_blank`, etc.
              (!e.currentTarget.target || e.currentTarget.target === '_self') &&
              // No modifier keys
              !e.ctrlKey &&
              !e.metaKey &&
              !e.shiftKey &&
              !e.altKey
            ) {
              e.preventDefault();
              e.redraw = false;
              route.set(href, null, options);
            }
          };
        }
        return child0;
      },
    };
    route.param = function (key3) {
      return attrs6 && key3 != null ? attrs6[key3] : attrs6;
    };
    return route;
  };
  var router = _31(typeof window !== 'undefined' ? window : null, mountRedraw);
  var m = function m() {
    return hyperscript.apply(this, arguments);
  };
  m.m = hyperscript;
  m.trust = hyperscript.trust;
  m.fragment = hyperscript.fragment;
  m.Fragment = '[';
  m.mount = mountRedraw.mount;
  m.route = router;
  m.render = render;
  m.redraw = mountRedraw.redraw;
  m.request = request.request;
  m.parseQueryString = parseQueryString;
  m.buildQueryString = buildQueryString;
  m.parsePathname = parsePathname;
  m.buildPathname = buildPathname;
  m.vnode = Vnode;
  m.censor = censor;
  m.domFor = domFor;
  if (typeof module !== 'undefined') module['exports'] = m;
  else window.m = m;
})();
 
}); 
require.register("rswebui", function(exports, require, module) { 
const m = require('mithril');

const RsEventsType = {
  NONE: 0, // Used internally to detect invalid event type passed

  // @see RsBroadcastDiscovery
  BROADCAST_DISCOVERY: 1,

  // @see RsDiscPendingPgpReceivedEvent
  GOSSIP_DISCOVERY: 2,

  // @see AuthSSL
  AUTHSSL_CONNECTION_AUTENTICATION: 3,

  // @see pqissl
  PEER_STATE: 4,

  // @see RsGxsChanges, used also in @see RsGxsBroadcast
  GXS_CHANGES: 5,

  // Emitted when a peer state changes, @see RsPeers
  _________UNUSED___001_: 6,

  // @see RsMailStatusEvent
  MAIL_STATUS: 7,

  // @see RsGxsCircleEvent
  GXS_CIRCLES: 8,

  // @see RsGxsChannelEvent
  GXS_CHANNELS: 9,

  // @see RsGxsForumEvent
  GXS_FORUMS: 10,

  // @see RsGxsPostedEvent
  GXS_POSTED: 11,

  // @see RsGxsPostedEvent
  GXS_IDENTITY: 12,

  // @see RsFiles @deprecated
  SHARED_DIRECTORIES: 13,

  // @see RsFiles
  FILE_TRANSFER: 14,

  // @see RsChats
  CHAT_SERVICE: 15,

  // @see rspeers.h
  NETWORK: 16,

  // @see RsMailTagEvent
  MAIL_TAG: 17,

  /** Emitted to update library clients about file hashing being completed */
  _________UNUSED___002_: 20,

  // @see rspeers.h
  TOR_MANAGER: 21,

  // @see rsfriendserver.h
  FRIEND_SERVER: 22,

  // _MAX //used internally, keep last
};

const API_URL = 'http://127.0.0.1:9092';
const loginKey = {
  username: sessionStorage.getItem('rs_username') || '',
  passwd: sessionStorage.getItem('rs_passwd') || '',
  isVerified: sessionStorage.getItem('rs_isVerified') === 'true',
  url: sessionStorage.getItem('rs_url') || API_URL,
};

// Make this as object property?
function setKeys(username, password, url = API_URL, verified = true) {
  loginKey.username = username;
  loginKey.passwd = password;
  loginKey.url = url;
  loginKey.isVerified = verified;

  if (verified) {
    sessionStorage.setItem('rs_username', username);
    sessionStorage.setItem('rs_passwd', password);
    sessionStorage.setItem('rs_url', url);
    sessionStorage.setItem('rs_isVerified', 'true');
  } else {
    sessionStorage.removeItem('rs_isVerified');
  }
}

function logout() {
  setKeys('', '', loginKey.url, false);
  m.route.set('/');
}

const connectionState = {
  status: true,
  //  Status of the last HTTP response, or 0 when the request never reached the
  //  core. Recorded in extract() so it stays available when the body fails to
  //  parse, which is how a truncated response shows up.
  lastHttpStatus: 0,
};

function rsJsonApiRequest(
  path,
  data = {},
  callback = () => { },
  async = true,
  headers = {},
  handleDeserialize = JSON.parse,
  handleSerialize = JSON.stringify,
  config = null
) {
  headers['Accept'] = 'application/json';
  if (loginKey.isVerified) {
    if (loginKey.username && loginKey.passwd) {
      headers['Authorization'] = 'Basic ' + btoa(loginKey.username + ':' + loginKey.passwd);
    }
  }
  // NOTE: After upgrading to mithrilv2, options.extract is no longer required
  // since the status will become part of return value and then
  // handleDeserialize can also be simply passed as options.deserialize
  return m
    .request({
      method: 'POST',
      url: loginKey.url + path,
      async,
      extract: (xhr) => {
        connectionState.lastHttpStatus = xhr.status;
        // Empty string is not valid json and fails on parse
        const response = xhr.responseText || '""';
        return {
          status: xhr.status,
          statusText: xhr.statusText,
          body: handleDeserialize(response),
        };
      },
      serialize: handleSerialize,
      headers,
      body: data,

      xhr: config,
    })
    .then((result) => {
      if (result.status === 200) {
        connectionState.status = true;
        try {
          callback(result.body, true);
        } catch (e) {
          console.error('[RS] Error in success callback for path:', path, e);
        }
      } else {
        //  An answer, whatever its code, proves the core is there. A 404 on an
        //  endpoint this build does not expose, or a 401 on a stale password,
        //  is not a lost connection: only status 0, i.e. no HTTP response at
        //  all, is. Flipping the flag on every error made the status LED blink
        //  red on each optional endpoint that is probed.
        connectionState.status = result.status !== 0;
        if (result.status === 401 || result.status === 403) {
          setKeys(loginKey.username, loginKey.passwd, loginKey.url, false);
          m.route.set('/');
        } else if (result.status === 0) {
          console.error('[RS] Retroshare-jsonapi not available.');
        } else {
          console.error('[RS] HTTP error:', result.status, result.statusText);
        }
        try {
          callback(result, false);
        } catch (e) {
          console.error('[RS] Error in error callback for path:', path, e);
        }
      }
      return result;
    })
    .catch(function (e) {
      //  Reaching here after a valid 200 means the body could not be parsed,
      //  i.e. the response was cut short. The core answered and is still there;
      //  it is the answer that did not survive the trip.
      connectionState.status = connectionState.lastHttpStatus === 200;
      try {
        callback(e, false);
      } catch (cbErr) {
        // console.error('[RS] Error in catch callback for path:', path, cbErr);
      }
      console.error('[RS] Error: While sending request for path:', path, '\ninfo:', e);
      //  Resolve to the same shape as a real answer, with an empty body. Most
      //  call sites go straight for res.body.retval, and resolving undefined
      //  turned every failed request into a TypeError thrown inside an onclick,
      //  where nothing catches it: the button silently does nothing. Every
      //  defensive check in the code base tests res.body.retval or res.body, so
      //  an empty body still reads as a failure to all of them.
      return { status: connectionState.lastHttpStatus, statusText: 'request failed', body: {} };
    });
}

function setBackgroundTask(task, interval, taskInScope) {
  // Always use bound(.bind) function when accsssing outside objects
  // to avoid loss of scope
  task();
  let taskId = setTimeout(function caller() {
    if (taskInScope()) {
      task();
      taskId = setTimeout(caller, interval);
    } else {
      clearTimeout(taskId);
    }
  }, interval);
  return taskId;
}

function computeIfMissing(map, key, missing = () => ({})) {
  if (!Object.prototype.hasOwnProperty.call(map, key)) {
    map[key] = missing();
  }
  return map[key];
}

function deeperIfExist(map, key, action) {
  if (Object.prototype.hasOwnProperty.call(map, key)) {
    action(map[key]);
    return true;
  } else {
    return false;
  }
}

const eventQueue = {
  events: {
    [RsEventsType.CHAT_SERVICE]: {
      // Chat-Messages
      types: {
        //                #define RS_CHAT_TYPE_PUBLIC  1
        //                #define RS_CHAT_TYPE_PRIVATE 2

        1: (cid) => hexId(cid),
        2: (cid) => hexId(cid),
        3: (cid) => hexId(cid),
        4: (cid) => hexId(cid),
      },
      messages: {},
      chatMessages: (chatId, owner, action) => {
        if (
          !deeperIfExist(owner.types, chatId.type, (keyfn) =>
            action(
              computeIfMissing(
                computeIfMissing(owner.messages, chatId.type),
                keyfn(chatId),

                () => []
              )
            )
          )
        ) {
          if (chatId) {
            // Silent match
          }
        }
      },
      handler: (event, owner) => {
        if (event && event.mChatMessage && event.mChatMessage.chat_id) {
          owner.chatMessages(event.mChatMessage.chat_id, owner, (r) => {
            r.push(event.mChatMessage);
            owner.notify(event.mChatMessage);
          });
        } else if (event && event.mCid) {
          // Administrative chat event (e.g. lobby info change, peer join/leave)
          // Silent for now to avoid console spam, as actual messages use mChatMessage
        }
      },
      notify: () => { },
    },
    [RsEventsType.GXS_CIRCLES]: {
      // Circles (ignore in the meantime)
      handler: (event, owner) => { },
    },
    [RsEventsType.SHARED_DIRECTORIES]: {
      // Deprecated/Administrative (ignore quietly)
      handler: (event, owner) => { },
    },
  },
  handler: (event) => {
    if (!deeperIfExist(eventQueue.events, event.mType, (owner) => owner.handler(event, owner))) {
      // Ignore unhandled events silently
    }
  },
};

const userList = {
  users: [],
  userMap: {},
  pendingIds: new Set(),
  fetchTimer: null,

  triggerFetch: () => {
    if (userList.fetchTimer) return;
    userList.fetchTimer = setTimeout(() => {
      userList.fetchTimer = null;
      if (userList.pendingIds.size === 0) return;

      const ids = Array.from(userList.pendingIds);
      userList.pendingIds.clear();

      userList.fetchBulk(ids);
    }, 1000);
  },

  fetchBulk: (ids) => {
    // Chunk requests to avoid too large payloads if necessary, but for now 100 is safe
    const chunkSize = 100;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      rsJsonApiRequest('/rsIdentity/getIdentitiesInfo', { ids: chunk }, (data, success) => {
        if (success && data.idsInfo) {
          data.idsInfo.forEach((info) => {
            const gid = info.mMeta && info.mMeta.mGroupId;
            if (gid) {
              userList.userMap[gid] = {
                name: info.mMeta.mGroupName,
                isContact: info.mIsAContact,
              };
            }
          });
          m.redraw();
        }
      });
    }
  },

  loadUsers: () => {
    rsJsonApiRequest('/rsIdentity/getIdentitiesSummaries', {}, (list) => {
      if (list !== undefined && list.ids) {
        userList.users = list.ids;
        userList.userMap = list.ids.reduce((a, c) => {
          a[c.mGroupId] = { name: c.mGroupName, isContact: false };
          return a;
        }, {});

        // Fetch contact status and details in bulk immediately
        userList.fetchBulk(list.ids.map((u) => u.mGroupId));
      }
    });
  },
  username: (id) => {
    if (!id) return '';
    const entry = userList.userMap[id];
    const name = typeof entry === 'object' ? entry.name : entry;

    if (!name && id.length > 10) {
      if (!userList.pendingIds.has(id)) {
        userList.pendingIds.add(id);
        userList.triggerFetch();
      }
      return id;
    }
    return name || id;
  },
};

/*
  path,
  data = {},
  callback = () => {},
  async = true,
  headers = {},
  handleDeserialize = JSON.parse,
  handleSerialize = JSON.stringify
  config
*/
function startEventQueue(
  info,
  loginHeader = {},
  displayAuthError = () => { },
  displayErrorMessage = () => { },
  successful = () => { }
) {
  const xhr = new window.XMLHttpRequest();
  let lastIndex = 0;
  xhr.open('POST', loginKey.url + '/rsEvents/registerEventsHandler', true);

  // Set headers for authentication
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...loginHeader,
  };

  if (loginKey.isVerified && !headers['Authorization']) {
    if (loginKey.username && loginKey.passwd) {
      headers['Authorization'] = 'Basic ' + btoa(loginKey.username + ':' + loginKey.passwd);
    }
  }

  Object.keys(headers).forEach((key) => {
    xhr.setRequestHeader(key, headers[key]);
  });

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      if (xhr.status === 401) {
        displayAuthError('Incorrect login/password.');
      }
    }
  };

  xhr.onprogress = (ev) => {
    const currIndex = xhr.responseText.length;
    if (currIndex > lastIndex) {
      const parts = xhr.responseText.substring(lastIndex, currIndex);
      lastIndex = currIndex;
      parts
        .trim()
        .split('\n\n')
        .filter((e) => e.trim().length > 0)
        .forEach((e) => {
          if (e.startsWith('data: {')) {
            try {
              const data = JSON.parse(e.substr(6));
              if (Object.prototype.hasOwnProperty.call(data, 'retval')) {
                if (data.retval.errorNumber !== 0) {
                  displayErrorMessage(
                    `${info} failed: [${data.retval.errorCategory}] ${data.retval.errorMessage}`
                  );
                } else {
                  successful();
                }
              } else if (Object.prototype.hasOwnProperty.call(data, 'event')) {
                data.event.queueSize = currIndex;
                try {
                  eventQueue.handler(data.event);
                } catch (err) {
                  console.error('[RS] Error in event handler:', err, data.event);
                }
              }
            } catch (err) {
              console.error('[RS] JSON parse error for part:', e, err);
            }
          }
        });
      if (currIndex > 1e6) {
        // max 1 MB eventQueue
        startEventQueue('restart queue');
        xhr.abort();
      }
    }
  };

  xhr.onload = () => { };

  xhr.onerror = (err) => {
    console.error('[RS] Event Queue XHR error occurred:', err);
    // Retry after 5 seconds to avoid silent event loss
    setTimeout(() => {
      console.log('[RS] Retrying event queue connection...');
      startEventQueue(info, loginHeader, displayAuthError, displayErrorMessage, successful);
    }, 5000);
  };

  // We need to send an eventType to registerEventsHandler
  // 0 means all events
  xhr.send(JSON.stringify({ eventType: 0 }));
  return xhr;
}

function logon(loginHeader, displayAuthError, displayErrorMessage, successful) {
  startEventQueue('login', loginHeader, displayAuthError, displayErrorMessage, () => {
    successful();
    userList.loadUsers();
  });
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function hexId(id) {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'number') return String(id);
  if (typeof id === 'object') {
    // 1. Check for xstr64 (64-bit wrapped ID)
    if (id.xstr64 && id.xstr64 !== '0') return id.xstr64;

    // 2. Search for any hex string of appropriate length (128-bit or 64-bit)
    const keys = Object.keys(id);
    for (let i = 0; i < keys.length; i++) {
      const val = id[keys[i]];
      if (typeof val === 'string' && val.length >= 16 && val !== '00000000000000000000000000000000') return val;
      // Search deeper for nested xstr64
      if (val && typeof val === 'object' && val.xstr64 && val.xstr64 !== '0') return val.xstr64;
    }
    // 3. Last resort fallbacks
    if (id.xstr64 !== undefined) return String(id.xstr64);
  }
  return String(id);
}

//  A RetroShare ID can be pasted bare, or inside a retroshare://... link where
//  it sits url-encoded behind rsInvite=. Both the Add friend wizard and the
//  location details dialog had their own copy of this; they now share one, the
//  variant that trims after decoding, since a pasted link often carries a
//  trailing newline.
function cleanRetroshareId(value) {
  const input = String(value || '').trim();
  const marker = 'rsInvite=';
  const markerPosition = input.indexOf(marker);
  const id = markerPosition >= 0 ? input.slice(markerPosition + marker.length) : input;

  try {
    return decodeURIComponent(id).trim();
  } catch (_) {
    return id.trim();
  }
}

module.exports = {
  rsJsonApiRequest,
  idToHex: hexId,
  connectionState,
  setKeys,
  setBackgroundTask,
  logon,
  events: eventQueue.events,
  RsEventsType,
  userList,
  loginKey,
  formatBytes,
  logout,
  cleanRetroshareId,
};
 
}); 
require.register("statusbar", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');

// RS_HIDDEN_TYPE constants (from config_util.js / retroshare/rspeers.h)
const RS_HIDDEN_TYPE_NONE    = 0;
const RS_HIDDEN_TYPE_TOR     = 2;
const RS_HIDDEN_TYPE_I2P     = 4;

const State = {
  friendCount: 0,
  onlineCount: 0,
  dhtActive: false,
  dhtOk: false,
  dhtRsNetSize: 0,
  dhtNetSize: 0,
  natState: 1, // BAD_UNKNOWN
  firewalled: true,
  forwardPort: false,
  stunOk: false,
  extAddressOk: false,

  // Hidden-mode / Tor+I2P state  (mirrors TorStatus widget in Qt)
  hiddenType: RS_HIDDEN_TYPE_NONE, // 0=none, 2=Tor, 4=I2P
  torProxyOk: null,   // null=unchecked, true=ok, false=fail
  torChecking: false,

  // Bandwidth rate status (mirrors RatesStatus widget in Qt)
  rateIn: 0.0,
  totalIn: 0,
  rateOut: 0.0,
  totalOut: 0,
};

function parse64Num(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  if (typeof val === 'object') {
    if (val.xuint64 !== undefined) return parseFloat(val.xuint64) || 0;
    if (val.xint64 !== undefined) return parseFloat(val.xint64) || 0;
    if (val.xstr64 !== undefined) return parseFloat(val.xstr64) || 0;
  }
  return 0;
}

function formatUnit(val) {
  const num = parse64Num(val);
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

function formatBytes(rawBytes) {
  const bytes = parse64Num(rawBytes);
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.max(0, Math.min(i, sizes.length - 1));
  return parseFloat((bytes / Math.pow(k, safeI)).toFixed(1)) + ' ' + sizes[safeI];
}

/**
 * Fetch the own peer's hidden type and proxy status using /rsTor API.
 * Mirrors Qt's TorStatus::getTorStatus().
 */
function updateTorStatus() {
  if (!rs.loginKey.isVerified) return;

  rs.rsJsonApiRequest('/rsAccounts/getCurrentAccountId').then((res) => {
    if (!res || !res.body || !res.body.retval) return;
    const sslId = res.body.id;

    rs.rsJsonApiRequest('/rsPeers/getPeerDetails', { sslId }).then((pres) => {
      if (!pres || !pres.body || !pres.body.retval) return;
      const details = pres.body.det;

      const isHiddenNode = Boolean(
        details && (
          details.hiddenType === RS_HIDDEN_TYPE_TOR ||
          details.hiddenType === RS_HIDDEN_TYPE_I2P ||
          details.extAddr === 'Hidden'
        )
      );

      if (!isHiddenNode) {
        State.hiddenType = RS_HIDDEN_TYPE_NONE;
        State.torProxyOk = null;
        State.torChecking = false;
        m.redraw();
        return;
      }

      const targetType = details.hiddenType || RS_HIDDEN_TYPE_TOR;
      State.hiddenType = targetType;

      // Check if node uses automated Tor management via /rsAccounts/isTorAuto (same as Qt)
      rs.rsJsonApiRequest('/rsAccounts/isTorAuto', {}).then((autoRes) => {
        const isAuto = autoRes && (autoRes.retval || (autoRes.body && autoRes.body.retval));
        if (isAuto) {
          Promise.all([
            rs.rsJsonApiRequest('/rsTor/torStatus', {}),
            rs.rsJsonApiRequest('/rsTor/torConnectivityStatus', {}),
          ]).then(([torRes, connRes]) => {
            const torStatus        = torRes  && torRes.body  ? torRes.body.retval  : (torRes  && torRes.retval !== undefined ? torRes.retval  : 0);
            const connStatus       = connRes && connRes.body ? connRes.body.retval : (connRes && connRes.retval !== undefined ? connRes.retval : 0);
            const torControlOk     = connStatus === 6; // HIDDEN_SERVICE_READY
            const torReady         = torStatus === 2;   // READY

            if (torReady && torControlOk) {
              State.torProxyOk     = true;
              State.torChecking    = false;
            } else if (torStatus === 1 || connStatus === 0 || connStatus === 1) {
              // OFFLINE, ERROR, or NOT_CONNECTED
              State.torProxyOk     = false;
              State.torChecking    = false;
            } else if (connStatus >= 2 && connStatus <= 5) {
              // CONNECTING, SOCKET_CONNECTED, AUTHENTICATING, AUTHENTICATED
              State.torProxyOk     = null;
              State.torChecking    = true;
            } else {
              // UNKNOWN / default
              State.torProxyOk     = null;
              State.torChecking    = false;
            }
            m.redraw();
          }).catch(() => {
            State.torProxyOk     = true;
            State.torChecking    = false;
            m.redraw();
          });
        } else {
          // Manual Tor / I2P proxy node
          State.torProxyOk     = true;
          State.torChecking    = false;
          m.redraw();
        }
      }).catch(() => {
        // Fallback for uncompiled backend: query /rsTor endpoints directly or assume active
        Promise.all([
          rs.rsJsonApiRequest('/rsTor/torStatus', {}),
          rs.rsJsonApiRequest('/rsTor/torConnectivityStatus', {}),
        ]).then(([torRes, connRes]) => {
          const torStatus        = torRes  && torRes.body  ? torRes.body.retval  : (torRes  && torRes.retval !== undefined ? torRes.retval  : 0);
          const connStatus       = connRes && connRes.body ? connRes.body.retval : (connRes && connRes.retval !== undefined ? connRes.retval : 0);
          const torControlOk     = connStatus === 6; // HIDDEN_SERVICE_READY
          const torReady         = torStatus === 2;   // READY

          if (torReady && torControlOk) {
            State.torProxyOk     = true;
            State.torChecking    = false;
          } else if (torStatus === 1 || connStatus === 0 || connStatus === 1) {
            State.torProxyOk     = false;
            State.torChecking    = false;
          } else if (connStatus >= 2 && connStatus <= 5) {
            State.torProxyOk     = null;
            State.torChecking    = true;
          } else {
            State.torProxyOk     = null;
            State.torChecking    = false;
          }
          m.redraw();
        }).catch(() => {
          State.torProxyOk     = true;
          State.torChecking    = false;
          m.redraw();
        });
      });
    });
  }).catch(() => {
    State.hiddenType = RS_HIDDEN_TYPE_NONE;
    State.torProxyOk = null;
  });
}

function updateStatus() {
  if (!rs.loginKey.isVerified) return;

  // 1. Friends count
  rs.rsJsonApiRequest('/rsPeers/getFriendList', {}, (data) => {
    if (data && data.sslIds) {
      State.friendCount = data.sslIds.length;
    }
  });
  rs.rsJsonApiRequest('/rsPeers/getOnlineList', {}, (data) => {
    if (data && data.sslIds) {
      State.onlineCount = data.sslIds.length;
    }
  });

  // 2. Net / DHT config status & NAT state
  rs.rsJsonApiRequest('/rsConfig/getConfigNetStatus', {}, (data) => {
    if (data && data.status) {
      State.dhtActive = data.status.DHTActive;
      State.dhtOk = data.status.netDhtOk;
      State.dhtRsNetSize = data.status.netDhtRsNetSize;
      State.dhtNetSize = data.status.netDhtNetSize;
      State.firewalled = data.status.firewalled;
      State.forwardPort = data.status.forwardPort;
      State.stunOk = data.status.netStunOk;
      State.extAddressOk = data.status.netExtAddressOk;

      // Compute NAT state directly from RsConfigNetStatus
      if (!data.status.netLocalOk && !data.status.netExtAddressOk) {
        State.natState = 2; // BAD_OFFLINE
      } else if (data.status.firewalled && !data.status.forwardPort && !data.status.netUpnpOk) {
        State.natState = 6; // WARNING_NATTED
      } else if (data.status.forwardPort || data.status.netUpnpOk) {
        State.natState = 9; // ADV_FORWARD
      } else {
        State.natState = 8; // GOOD
      }
    }
  });

  // 3. NAT netState from /rsConfig/getNetState
  rs.rsJsonApiRequest('/rsConfig/getNetState', {}, (data) => {
    if (data && data.retval !== undefined) {
      State.natState = data.retval;
      m.redraw();
    } else if (data && data.body && data.body.retval !== undefined) {
      State.natState = data.body.retval;
      m.redraw();
    }
  });

  // 4. Tor/I2P hidden-mode status (same as Qt TorStatus widget)
  updateTorStatus();

  // 5. Bandwidth rates (same as Qt RatesStatus widget)
  rs.rsJsonApiRequest('/rsConfig/getTotalBandwidthRates', {}, (data) => {
    const rates = (data && data.rates) || (data && data.body && data.body.rates);
    if (rates) {
      State.rateIn   = rates.mRateIn   !== undefined ? rates.mRateIn   : (rates.rateIn   || 0.0);
      State.totalIn  = rates.mTotalIn  !== undefined ? rates.mTotalIn  : (rates.totalIn  || 0);
      State.rateOut  = rates.mRateOut  !== undefined ? rates.mRateOut  : (rates.rateOut  || 0.0);
      State.totalOut = rates.mTotalOut !== undefined ? rates.mTotalOut : (rates.totalOut || 0);
      m.redraw();
    }
  });
}

let intervalId = null;

const StatusBar = {
  oninit() {
    updateStatus();
    intervalId = setInterval(updateStatus, 10000); // update every 10s
  },
  onremove() {
    if (intervalId) {
      clearInterval(intervalId);
    }
  },
  view() {
    const isHiddenMode = State.hiddenType === RS_HIDDEN_TYPE_TOR ||
                         State.hiddenType === RS_HIDDEN_TYPE_I2P;

    // ── DHT Status (hidden when in hidden/darknet mode) ────────────────────
    let dhtColor = '#94a3b8'; // grey (off)
    let dhtTooltip = 'DHT Off';
    if (State.dhtActive) {
      if (State.dhtOk) {
        if (State.dhtRsNetSize < 10) {
          dhtColor = '#eab308'; // yellow (searching)
          dhtTooltip = 'DHT Searching for RetroShare Peers';
        } else {
          dhtColor = '#22c55e'; // green (good)
          dhtTooltip = 'DHT Good';
        }
      } else {
        dhtColor = '#ef4444'; // red (error)
        dhtTooltip = 'No peer found in DHT';
      }
    }

    // ── NAT Status (hidden when in hidden/darknet mode) ────────────────────
    let natColor = '#94a3b8';
    let natTooltip = 'Offline';
    switch (State.natState) {
      case 1: // BAD_UNKNOWN
        natColor = '#eab308';
        natTooltip = 'Network Status Unknown';
        break;
      case 2: // BAD_OFFLINE
        natColor = '#94a3b8';
        natTooltip = 'Offline';
        break;
      case 3: // BAD_NATSYM
      case 4: // BAD_NODHT_NAT
        natColor = '#ef4444';
        natTooltip = State.natState === 4 ? 'DHT Disabled and Firewalled' : 'Nasty Firewall';
        break;
      case 5: // WARNING_RESTART
        natColor = '#eab308';
        natTooltip = 'Network Restarting';
        break;
      case 6: // WARNING_NATTED
        natColor = '#eab308';
        natTooltip = 'Behind Firewall';
        break;
      case 7: // WARNING_NODHT
        natColor = '#eab308';
        natTooltip = 'DHT Disabled';
        break;
      case 8: // GOOD
        natColor = '#22c55e';
        natTooltip = 'RetroShare Server';
        break;
      case 9: // ADV_FORWARD
        natColor = '#22c55e';
        natTooltip = 'Forwarded Port';
        break;
    }

    // ── Tor / I2P status indicator ─────────────────────────────────────────
    // Only shown when peer is in RS_NETMODE_HIDDEN with a proxy type set.
    // Mirrors Qt TorStatus widget label + icon logic.
    let torLabel, torColor, torIcon, torTooltip;
    if (isHiddenMode) {
      torLabel = State.hiddenType === RS_HIDDEN_TYPE_TOR ? 'Tor:' : 'I2P:';
      if (State.torChecking) {
        torColor = '#f59e0b';
        torIcon  = 'fas fa-spinner fa-spin';
        torTooltip = 'Checking proxy…';
      } else if (State.torProxyOk === null) {
        torColor = '#94a3b8';
        torIcon  = 'fas fa-shield-alt';
        torTooltip = State.hiddenType === RS_HIDDEN_TYPE_TOR
          ? 'No Tor configuration'
          : 'No I2P configuration';
      } else if (State.torProxyOk) {
        torColor = '#22c55e';
        torIcon  = 'fas fa-shield-alt';
        torTooltip = State.hiddenType === RS_HIDDEN_TYPE_TOR
          ? 'Tor proxy is OK'
          : 'I2P proxy is OK';
      } else {
        torColor = '#ef4444';
        torIcon  = 'fas fa-shield-alt';
        torTooltip = State.hiddenType === RS_HIDDEN_TYPE_TOR
          ? 'Tor proxy is not available'
          : 'I2P proxy is not available';
      }
    }

    return m('.statusbar', [
      m('.statusbar-left', [
        m('.statusbar-item', [
          m('i.fas.fa-users', { style: 'margin-right: 0.35rem; color: #94a3b8;' }),
          m('span.statusbar-label', 'Friends:\u00a0'),
          m('span.statusbar-value', `${State.onlineCount}/${State.friendCount}`),
        ]),

        // NAT — hidden when in hidden/darknet mode (same as Qt)
        !isHiddenMode && m('.statusbar-divider'),
        !isHiddenMode && m('.statusbar-item.statusbar-item--nat', {
          title: natTooltip,
          style: 'cursor: help; margin-left: 0.6rem;',
        }, [
          m('span.statusbar-label', { style: 'margin-right: 0.35rem;' }, 'NAT:'),
          m('.status-bullet', {
            style: { backgroundColor: natColor, marginLeft: '0.15rem', marginRight: '0.45rem' },
          }),
        ]),

        // DHT — hidden when in hidden/darknet mode (same as Qt)
        !isHiddenMode && m('.statusbar-divider'),
        !isHiddenMode && m('.statusbar-item.statusbar-item--dht', {
          title: dhtTooltip,
          style: 'cursor: help; margin-left: 0.6rem;',
        }, [
          m('span.statusbar-label', { style: 'margin-right: 0.35rem;' }, 'DHT:'),
          m('.status-bullet', {
            style: { backgroundColor: dhtColor, marginLeft: '0.15rem', marginRight: '0.35rem' },
          }),
          State.dhtActive && State.dhtOk && m('span.statusbar-extra-info', { style: 'margin-left: 0.35rem;' }, `${formatUnit(State.dhtRsNetSize)} (${formatUnit(State.dhtNetSize)})`),
        ]),

        // Tor / I2P — only shown when in hidden/darknet mode (same as Qt)
        isHiddenMode && m('.statusbar-divider'),
        isHiddenMode && m('.statusbar-item.statusbar-item--tor', {
          title: torTooltip,
          style: 'cursor: help;',
        }, [
          m('span.tor-label', { style: 'margin-right: 0.4rem; font-weight: 600;' }, torLabel),
          m('i.' + torIcon, { style: { color: torColor, fontSize: '1rem', transition: 'color 0.3s' } }),
        ]),
      ]),

      // RatesStatus — Bandwidth speeds & total cumulative transfer (Down | Up)
      m('.statusbar-right', [
        m('.statusbar-item', {
          title: `Downloaded: ${formatBytes(State.totalIn)}`,
          style: 'cursor: help;'
        }, [
          m('i.fas.fa-arrow-down', { style: 'color: #22c55e; margin-right: 0.25rem;' }),
          m('span.statusbar-label', 'Down:\u00a0'),
          m('span.statusbar-value', `${State.rateIn.toFixed(1)} kB/s`),
          m('span.statusbar-total-bytes', { style: 'color: #64748b; font-size: 0.8rem; margin-left: 0.25rem;' }, `(${formatBytes(State.totalIn)})`),
        ]),
        m('.statusbar-divider'),
        m('.statusbar-item', {
          title: `Uploaded: ${formatBytes(State.totalOut)}`,
          style: 'cursor: help;'
        }, [
          m('i.fas.fa-arrow-up', { style: 'color: #3b82f6; margin-right: 0.25rem;' }),
          m('span.statusbar-label', 'Up:\u00a0'),
          m('span.statusbar-value', `${State.rateOut.toFixed(1)} kB/s`),
          m('span.statusbar-total-bytes', { style: 'color: #64748b; font-size: 0.8rem; margin-left: 0.25rem;' }, `(${formatBytes(State.totalOut)})`),
        ]),
      ]),
    ]);
  },
};

module.exports = StatusBar;
 
}); 
require.register("widgets", function(exports, require, module) { 
const m = require('mithril');
const Sidebar = () => {
  let mobileOpen = false;
  let isMobileWidth = false;
  let widthQuery;
  let onWidthChange;

  const links = (v) => v.attrs.tabs.map((panelName) => {
    const href = v.attrs.baseRoute + panelName;
    const selected = m.route.get().toLowerCase().startsWith(href.toLowerCase());
    return m('a', {
      class: selected ? 'selected-sidebar-link' : '',
      href,
      onclick: (event) => {
        event.preventDefault();
        mobileOpen = false;
        m.route.set(href);
      },
    }, panelName);
  });

  return {
    oninit: () => {
      widthQuery = window.matchMedia('(max-width: 700px)');
      isMobileWidth = widthQuery.matches;
      onWidthChange = (event) => {
        isMobileWidth = event.matches;
        if (!isMobileWidth) mobileOpen = false;
        m.redraw();
      };
      if (widthQuery.addEventListener) widthQuery.addEventListener('change', onWidthChange);
      else widthQuery.addListener(onWidthChange);
    },
    onremove: () => {
      if (!widthQuery || !onWidthChange) return;
      if (widthQuery.removeEventListener) widthQuery.removeEventListener('change', onWidthChange);
      else widthQuery.removeListener(onWidthChange);
    },
    view: (v) => {
      if (!v.attrs.mobileDrawer || !isMobileWidth) return m('.sidebar', links(v));
      return m('.sidebar-drawer', [
        m('button.sidebar-mobile-toggle[type=button][aria-label=Open navigation]', {
          'aria-expanded': mobileOpen,
          onclick: () => { mobileOpen = !mobileOpen; },
        }, m('i.fas.fa-bars')),
        mobileOpen ? m('.sidebar-drawer__backdrop', { onclick: () => { mobileOpen = false; } }) : null,
        m('.sidebar', { class: mobileOpen ? 'sidebar--mobile-open' : '' }, [
          m('.sidebar-drawer__title', 'Navigation'),
          ...links(v),
        ]),
      ]);
    },
  };
};
const SidebarQuickView = () => {
  // for the Mail tab, to be moved later.
  let quickactive = -1;
  return {
    view: (v) =>
      m(
        '.sidebarquickview',
        m('h4', 'Quick View'),
        v.attrs.tabs.map((panelName, index) =>
          m(
            m.route.Link,
            {
              class: index === quickactive ? 'selected-sidebarquickview-link' : '',
              onclick: () => (quickactive = index),
              href: v.attrs.baseRoute + panelName,
            },
            panelName
          )
        )
      ),
  };
};

// There are ways of doing this inside m.route but it is probably
// cleaner and faster when kept outside of the main auto
// rendering system
function popupMessage(message, modalClass = '') {
  const container = document.getElementById('modal-container');
  container.style.display = 'block';
  //  A vnode carries the DOM node it owns, so the same one cannot be rendered
  //  twice. popupMessage is handed a ready made vnode and mounts it, which
  //  re-renders it on every global redraw, so it has to hand out a fresh copy
  //  each time -- and a copy all the way down. Cloning only the root leaves the
  //  children array shared, and `old === vnodes` makes mithril skip the whole
  //  subtree: the modal content is then frozen at its first render.
  const freshVnode = (vnode) => {
    if (Array.isArray(vnode)) return vnode.map(freshVnode);
    if (!vnode || typeof vnode !== 'object' || !vnode.tag) return vnode;
    //  '<' is m.trust and '[' is m.fragment: neither is a selector m() knows how
    //  to parse. Rebuilding them with m() would silently turn trusted html into
    //  an empty div, so they go back through their own factory. '#' is a text
    //  vnode, whose children is the string itself.
    if (vnode.tag === '<') return m.trust(vnode.children);
    if (vnode.tag === '#') return vnode.children;
    if (vnode.tag === '[') return m.fragment(vnode.attrs, freshVnode(vnode.children));
    return m(vnode.tag, vnode.attrs, freshVnode(vnode.children));
  };
  const Popup = {
    view: () => m(`.modal-content${modalClass ? `.${modalClass}` : ''}`, [
      m(
        'button.red.close-btn',
        {
          onclick: () => {
            m.mount(container, null);
            container.style.display = 'none';
          },
        },
        m('i.fas.fa-times')
      ),
      freshVnode(message),
    ]),
  };

  m.mount(container, Popup);
}

module.exports = {
  Sidebar,
  SidebarQuickView,
  popupMessage,
};
 
}); 
require.register("boards/boards", function(exports, require, module) { 
const m = require('mithril');
const widget = require('widgets');
const rs = require('rswebui');
const util = require('boards/boards_util');
const viewUtil = require('boards/board_view');
const peopleUtil = require('people/people_util');

const getBoards = {
  All: [],
  Popular: [],
  Subscribed: [],
  MyBoards: [],
  Other: [],
  async load() {
    try {
      const res = await rs.rsJsonApiRequest('/rsPosted/getBoardsSummaries');
      const boards = res && res.body && Array.isArray(res.body.groupInfo) ? res.body.groupInfo : null;
      if (!boards) {
        console.warn('Boards summaries response did not include groupInfo', res && res.body);
        return;
      }
      getBoards.All = boards;
      const popular = [...boards].sort((a, b) => (b.mPop || 0) - (a.mPop || 0));
      getBoards.Other = popular.slice(5);
      getBoards.Popular = popular.slice(0, 5);
      getBoards.Subscribed = boards.filter(
        (board) => board.mSubscribeFlags === util.GROUP_SUBSCRIBE_SUBSCRIBED
      );
      getBoards.MyBoards = boards.filter(
        (board) => board.mSubscribeFlags === util.GROUP_MY_BOARD
      );
      m.redraw();
    } catch (error) {
      console.warn('Failed to load board summaries', error);
    }
  },
};

const sections = {
  MyBoards: require('boards/my_boards'),
  Subscribed: require('boards/subscribed_boards'),
  Popular: require('boards/popular_boards'),
  Other: require('boards/other_boards'),
};

const Layout = () => {
  let ownId;

  return {
    oninit: () => {
      rs.setBackgroundTask(getBoards.load, 30000, () => {
        return m.route.get().startsWith('/boards');
      });
      peopleUtil.ownIds((data) => {
        ownId = data;
        for (let i = 0; i < ownId.length; i++) {
          if (Number(ownId[i]) === 0) {
            ownId.splice(i, 1);
          }
        }
        ownId.unshift(0);
      });
    },
    view: (vnode) =>
      m('.widget', [
        m('.top-heading', [
          m(
            'button',
            {
              onclick: () =>
                ownId &&
                util.popupmessage(
                  m(viewUtil.createboard, {
                    authorId: ownId,
                    onCreated: getBoards.load,
                  }),
                  'create-board-modal'
                ),
            },
            'Create Board'
          ),
          m(util.SearchBar, {
            list: getBoards.All,
          }),
        ]),
        Object.prototype.hasOwnProperty.call(vnode.attrs.pathInfo, 'mMsgId')
          ? m(viewUtil.PostView, {
              msgId: vnode.attrs.pathInfo.mMsgId,
              forumId: vnode.attrs.pathInfo.mGroupId,
            })
          : Object.prototype.hasOwnProperty.call(vnode.attrs.pathInfo, 'mGroupId')
          ? m(viewUtil.BoardView, {
              id: vnode.attrs.pathInfo.mGroupId,
            })
          : m(sections[vnode.attrs.pathInfo.tab], {
              list: getBoards[vnode.attrs.pathInfo.tab],
            }),
      ]),
  };
};

module.exports = {
  view: (vnode) => {
    return [
      m(widget.Sidebar, {
        tabs: Object.keys(sections),
        baseRoute: '/boards/',
        mobileDrawer: true,
      }),
      m('.node-panel', m(Layout, { pathInfo: vnode.attrs })),
    ];
  },
};
 
}); 
require.register("boards/boards_util", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const peopleUtil = require('people/people_util');
const widget = require('widgets');

const GROUP_SUBSCRIBE_ADMIN = 0x01; // means: you have the admin key for this group
const GROUP_SUBSCRIBE_PUBLISH = 0x02; // means: you have the publish key for thiss group. Typical use: publish key in channels are shared with specific friends.
const GROUP_SUBSCRIBE_SUBSCRIBED = 0x04; // means: you are subscribed to a group, which makes you a source for this group to your friend nodes.
const GROUP_SUBSCRIBE_NOT_SUBSCRIBED = 0x08;
const GROUP_MY_BOARD = GROUP_SUBSCRIBE_ADMIN + GROUP_SUBSCRIBE_SUBSCRIBED + GROUP_SUBSCRIBE_PUBLISH;
const GXS_VOTE_DOWN = 0x0001;
const GXS_VOTE_UP = 0x0002;

// rsgxscircles.h:50
const PUBLIC = 1; // Public distribution
const EXTERNAL = 2; // Restricted to an external circle, based on GxsIds
const NODES_GROUP = 3;

const Data = {
  DisplayBoards: {}, // boardID -> board info
  Posts: {}, // boardID, PostID -> {post, isSearched}
  Comments: {}, // threadID, msgID -> {Comment, showReplies}
};

// Older Qt clients store board notes as rich HTML. Render them as readable,
// inert text in the web UI instead of exposing the markup and embedded CSS.
function plainText(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (!/<\/?[a-z][^>]*>/i.test(text)) return text.trim();
  return text
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(nbsp|#160);/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

const BOARD_POST_BATCH_SIZE = 25;

async function updateContent(content, boardid) {
  const requested = Array.isArray(content) ? content : [content];
  const msgIds = requested
    .map((item) => item.mMsgId || item.msgId || item)
    .filter(Boolean);
  if (msgIds.length === 0) return false;
  try {
    const res = await rs.rsJsonApiRequest('/rsPosted/getBoardContent', {
      boardId: boardid,
      contentsIds: msgIds,
    });
    if (res && res.body && res.body.retval) {
      const posts = res.body.posts || res.body.postList || [];
      const comments = res.body.comments || res.body.commentList || [];
      const votes = res.body.votes || res.body.voteList || [];

      if (posts.length > 0) {
        if (!Data.Posts[boardid]) Data.Posts[boardid] = {};
        posts.forEach((post) => {
          const msgId = post.mMeta && post.mMeta.mMsgId;
          if (msgId) Data.Posts[boardid][msgId] = { post, isSearched: true };
        });
        m.redraw();
      } else if (comments.length > 0 && requested.length === 1) {
        const threadId = requested[0].mThreadId || comments[0].mMeta.mThreadId;
        if (Data.Comments[threadId] === undefined) {
          Data.Comments[threadId] = {};
        }
        Data.Comments[threadId][msgIds[0]] = comments[0];
        m.redraw();
      } else if (votes.length > 0) {
        const vote = votes[0];
        if (
          Data.Comments[vote.mMeta.mThreadId] &&
          Data.Comments[vote.mMeta.mThreadId][vote.mMeta.mParentId]
        ) {
          if (vote.mVoteType === GXS_VOTE_UP) {
            Data.Comments[vote.mMeta.mThreadId][vote.mMeta.mParentId].mUpVotes += 1;
          }
          if (vote.mVoteType === GXS_VOTE_DOWN) {
            Data.Comments[vote.mMeta.mThreadId][vote.mMeta.mParentId].mDownVotes += 1;
          }
          m.redraw();
        }
      }
      return true;
    }
  } catch (err) {
    console.warn('updateContent error:', err);
  }
  return false;
}

// Same as the channel loader: a post can carry base64 media, and the JSON API
// cuts a response it cannot flush in time. Retry a failed batch as two smaller
// ones until the offending post is isolated, instead of dropping the 25 of them
// on a single console.warn. Do not split when the core stopped answering, or
// one batch would turn into 2N-1 doomed requests.
async function updateContentBatch(contentIds, boardid) {
  const loaded = await updateContent(contentIds, boardid);
  if (loaded || contentIds.length <= 1 || !rs.connectionState.status) {
    if (!loaded) {
      console.warn('Unable to load board content item', contentIds[0]);
    }
    return;
  }

  const middle = Math.ceil(contentIds.length / 2);
  await updateContentBatch(contentIds.slice(0, middle), boardid);
  await updateContentBatch(contentIds.slice(middle), boardid);
}

const inFlightBoards = {};

async function updateDisplayBoards(keyid, details) {
  if (!keyid) return Promise.resolve();

  // 1. Fast path: if posts for this board are already loaded in memory, render instantly and do not re-fetch
  if (Data.DisplayBoards[keyid] && Data.Posts[keyid] && Object.keys(Data.Posts[keyid]).length > 0) {
    m.redraw();
    return Promise.resolve();
  }

  // 2. Prevent duplicate concurrent HTTP requests for the same board ID
  if (inFlightBoards[keyid]) {
    return inFlightBoards[keyid];
  }

  inFlightBoards[keyid] = (async () => {
    try {
      // Fetch board info metadata if missing
      if (!Data.DisplayBoards[keyid]) {
        const res1 = await rs.rsJsonApiRequest('/rsPosted/getBoardsInfo', {
          boardsIds: [keyid],
        });
        if (res1 && res1.body && res1.body.boardsInfo && res1.body.boardsInfo.length > 0) {
          details = res1.body.boardsInfo[0];
          Data.DisplayBoards[keyid] = {
            name: details.mMeta.mGroupName,
            isSearched: true,
            description: details.mDescription,
            image: details.mGroupImage,
            author: details.mMeta.mAuthorId,
            subscribeFlags: details.mMeta.mSubscribeFlags,
            isSubscribed:
              details.mMeta.mSubscribeFlags === GROUP_SUBSCRIBE_SUBSCRIBED ||
              details.mMeta.mSubscribeFlags === GROUP_MY_BOARD,
            posts: details.mMeta.mVisibleMsgCount,
            activity: details.mMeta.mLastPost,
            created: details.mMeta.mPublishTs,
            all: details,
          };
          m.redraw();
        }
      }

      if (!Data.Posts[keyid]) {
        Data.Posts[keyid] = {};
      }

      // Load lightweight post metadata first, then fetch complete posts newest
      // first in page-sized batches. The first page can render without waiting
      // for every image and older post in a large board.
      const summariesRes = await rs.rsJsonApiRequest('/rsPosted/getBoardPostSummaries', {
        boardId: keyid,
      });
      const summaries = summariesRes && summariesRes.body && summariesRes.body.retval
        && Array.isArray(summariesRes.body.summaries)
        ? summariesRes.body.summaries
        : null;

      if (summaries) {
        summaries.sort((a, b) => Number((b.mPublishTs && b.mPublishTs.xint64) || b.mPublishTs || 0)
          - Number((a.mPublishTs && a.mPublishTs.xint64) || a.mPublishTs || 0));
        for (let i = 0; i < summaries.length; i += BOARD_POST_BATCH_SIZE) {
          await updateContentBatch(summaries.slice(i, i + BOARD_POST_BATCH_SIZE), keyid);
        }
      } else {
        // Compatibility fallback for RetroShare cores which do not yet expose
        // getBoardPostSummaries.
        const resAll = await rs.rsJsonApiRequest('/rsPosted/getBoardAllContent', {
          boardId: keyid,
        });
        const posts = resAll && resAll.body && resAll.body.retval
          ? (resAll.body.posts || resAll.body.postList || [])
          : [];
        posts.forEach((post) => {
          const msgId = (post.mMeta && post.mMeta.mMsgId) || post.mMsgId;
          if (msgId) Data.Posts[keyid][msgId] = { post, isSearched: true };
        });
        m.redraw();
      }
    } catch (err) {
      console.warn('updateDisplayBoards network error for board:', keyid, err);
    } finally {
      delete inFlightBoards[keyid];
    }
  })();

  return inFlightBoards[keyid];
}

const BoardSummary = () => {
  return {
    view: (vnode) => {
      const details = vnode.attrs.details;
      const bname = details.mGroupName || details.name || '';

      return m(
        'tr',
        {
          key: details.mGroupId,
          onclick: () => {
            m.route.set('/boards/:tab/:mGroupId', {
              tab: vnode.attrs.category,
              mGroupId: details.mGroupId,
            });
          },
        },
        [
          m('td', bname),
        ]
      );
    },
  };
};

const BoardTable = () => {
  return {
    view: (vnode) =>
      m('table.board-table', [
        m('thead', [
          m('tr', [
            m('th', 'Board Name'),
          ]),
        ]),
        vnode.children,
      ]),
  };
};

const SearchBar = () => {
  let searchString = '';
  return {
    view: (vnode) =>
      m('.search-bar', [
        m('input[type=text][placeholder=Search Boards...]', {
          value: searchString,
          oninput: (e) => {
            searchString = e.target.value;
            const query = searchString.toLowerCase();
            if (vnode.attrs.list) {
              vnode.attrs.list.forEach((board) => {
                const name = (board.mGroupName || board.name || '').toLowerCase();
                board.isSearched = name.includes(query);
              });
            }
          },
        }),
      ]),
  };
};

function popupmessage(message, modalClass = '') {
  widget.popupMessage(message, modalClass);
}

async function voteForPost(postGrpId, postMsgId, voteType, voterId = null) {
  try {
    let authorId = voterId;
    if (!authorId) {
      //  Goes through people_util so the endpoints and their caching stay in
      //  one place: /rsIdentity/getOwnIds is deprecated and answers 404.
      const ownIds = await peopleUtil.ownIds();
      if (ownIds.length === 0) {
        alert('No identity found to vote.');
        return false;
      }
      authorId = ownIds[0];
    }

    const res = await rs.rsJsonApiRequest('/rsPosted/voteForPost', {
      postGrpId,
      postMsgId,
      authorId,
      vote: voteType,
    });

    if (res && res.body && res.body.retval) {
      updateDisplayBoards(postGrpId);
      m.redraw();
      return true;
    }
  } catch (e) {
    console.error('voteForPost error:', e);
  }
  return false;
}

async function voteForComment(boardId, postId, commentId, voteType, authorId) {
  if (!authorId) return false;
  try {
    const res = await rs.rsJsonApiRequest('/rsPosted/voteForComment', {
      boardId,
      postId,
      commentId,
      authorId,
      vote: voteType,
    });
    if (res && res.body && res.body.retval) {
      updateDisplayBoards(boardId);
      m.redraw();
      return true;
    }
    console.warn('voteForComment failed:', res && res.body && res.body.errorMessage);
  } catch (error) {
    console.error('voteForComment error:', error);
  }
  return false;
}

module.exports = {
  Data,
  updateDisplayBoards,
  updateContent,
  BoardSummary,
  BoardTable,
  SearchBar,
  popupmessage,
  voteForPost,
  voteForComment,
  plainText,
  GXS_VOTE_UP,
  GXS_VOTE_DOWN,
  GROUP_SUBSCRIBE_ADMIN,
  GROUP_SUBSCRIBE_PUBLISH,
  GROUP_SUBSCRIBE_SUBSCRIBED,
  GROUP_SUBSCRIBE_NOT_SUBSCRIBED,
  GROUP_MY_BOARD,
  PUBLIC,
  EXTERNAL,
  NODES_GROUP,
};
 
}); 
require.register("boards/board_kanban", function(exports, require, module) { 
const m = require('mithril');
const util = require('boards/boards_util');

const PAGE_SIZE = 25;

function numberValue(value) {
  if (value && typeof value === 'object' && value.xint64 !== undefined) value = value.xint64;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/**
 * Fallback SVG Thumbnail when no image is available
 */
const FallbackImage = () =>
  m('.board-card__placeholder-content', {
    style: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '.3rem', color: '#64748b', fontSize: '.72rem', fontWeight: '600', textAlign: 'center',
    },
  }, [
    m('i.fas.fa-image[aria-hidden=true]', { style: { fontSize: '1.35rem' } }),
    m('span', 'No image'),
  ]);

/**
 * Check if notes string contains non-whitespace text
 */
function hasNotesText(notes) {
  if (notes === null || notes === undefined) return false;
  if (typeof notes !== 'string') notes = String(notes);
  return notes.trim().length > 0;
}

/**
 * Robust image extraction helper for RetroShare post items
 */
function extractImageSrc(item) {
  if (!item) return '';
  const p = item.post || item;

  if (item.thumbnail && typeof item.thumbnail === 'string' && item.thumbnail.trim() !== '') {
    return item.thumbnail.startsWith('data:') ? item.thumbnail : `data:image/png;base64,${item.thumbnail}`;
  }
  if (item.image && typeof item.image === 'string' && item.image.trim() !== '') {
    return item.image.startsWith('data:') ? item.image : `data:image/png;base64,${item.image}`;
  }
  if (p.mImage) {
    if (p.mImage.mData && p.mImage.mData.base64 && p.mImage.mData.base64.trim() !== '') {
      return `data:image/png;base64,${p.mImage.mData.base64}`;
    }
    if (typeof p.mImage.base64 === 'string' && p.mImage.base64.trim() !== '') {
      return `data:image/png;base64,${p.mImage.base64}`;
    }
    if (typeof p.mImage === 'string' && p.mImage.trim() !== '') {
      return p.mImage.startsWith('data:') ? p.mImage : `data:image/png;base64,${p.mImage}`;
    }
  }
  if (p.mThumbnail) {
    if (p.mThumbnail.mData && p.mThumbnail.mData.base64 && p.mThumbnail.mData.base64.trim() !== '') {
      return `data:image/png;base64,${p.mThumbnail.mData.base64}`;
    }
    if (typeof p.mThumbnail.base64 === 'string' && p.mThumbnail.base64.trim() !== '') {
      return `data:image/png;base64,${p.mThumbnail.base64}`;
    }
    if (typeof p.mThumbnail === 'string' && p.mThumbnail.trim() !== '') {
      return p.mThumbnail.startsWith('data:') ? p.mThumbnail : `data:image/png;base64,${p.mThumbnail}`;
    }
  }

  // Check notes/body text for embedded data:image or web URL
  const text = p.mNotes || p.mBody || item.notes || item.body || '';
  if (typeof text === 'string') {
    const dataMatch = text.match(/data:image\/[a-zA-Z]+;base64,[^"\s)]+/);
    if (dataMatch) return dataMatch[0];
    const urlMatch = text.match(/https?:\/\/[^\s")<]+\.(?:png|jpg|jpeg|gif|webp)/i);
    if (urlMatch) return urlMatch[0];
  }

  return '';
}

/**
 * Dedicated fullscreen photo overlay appended directly to document.body.
 * Bypasses #modal-container entirely so z-index is guaranteed.
 */
let _photoOverlayEl = null;

function getPhotoOverlay() {
  if (!_photoOverlayEl) {
    _photoOverlayEl = document.createElement('div');
    _photoOverlayEl.id = 'photo-view-overlay';
    document.body.appendChild(_photoOverlayEl);
  }
  return _photoOverlayEl;
}

function closePhotoOverlay() {
  if (_photoOverlayEl) {
    _photoOverlayEl.style.display = 'none';
    m.render(_photoOverlayEl, null);
  }
}

/**
 * PhotoView Lightbox — Qt GUI style: nav arrows outside the image in a 3-col flex row
 */
function PhotoViewModal() {
  let currentIndex = 0;

  function navigate(photoList, newIndex) {
    currentIndex = newIndex;
    m.render(getPhotoOverlay(), m(PhotoViewModal, {
      photoList,
      photoIndex: currentIndex,
    }));
  }

  return {
    oninit: (vnode) => {
      currentIndex = vnode.attrs.photoIndex || 0;
    },
    view: (vnode) => {
      const { photoList = [] } = vnode.attrs;
      if (!photoList || photoList.length === 0) return null;

      if (currentIndex < 0) currentIndex = 0;
      if (currentIndex >= photoList.length) currentIndex = photoList.length - 1;

      const currentItem = photoList[currentIndex];
      if (!currentItem) return null;

      const p = currentItem.post || currentItem;
      const meta = (p && p.mMeta) ? p.mMeta : (currentItem.mMeta || {});
      const title = currentItem.title || meta.mMsgName || 'Photo View';
      const imgSrc = extractImageSrc(currentItem);
      const author = meta.mAuthorId ? meta.mAuthorId.substring(0, 10) : 'Unknown';
      const publishTs = meta.mPublishTs || currentItem.created;
      const dateStr = publishTs
        ? (typeof publishTs === 'object' && publishTs.xint64
            ? new Date(publishTs.xint64 * 1000).toLocaleString()
            : new Date(publishTs * 1000).toLocaleString())
        : '';

      const hasPrev = currentIndex > 0;
      const hasNext = currentIndex < photoList.length - 1;

      return m('.photo-view-dialog', [
        // Header: italic title + X close (Qt style)
        m('.photo-view-header', [
          m('h3.photo-view-title', title),
          m('button.photo-view-close-btn', {
            type: 'button',
            onclick: closePhotoOverlay,
            title: 'Close',
          }, '\u00d7'),
        ]),

        // Body: 3-column flex [left-nav] [image] [right-nav]
        // Arrows are outside the image, matching Qt GUI
        m('.photo-view-body', [
          m('.photo-view-nav-col', [
            hasPrev
              ? m('button.photo-view-nav-btn', {
                  type: 'button',
                  title: 'Previous',
                  onclick: (e) => { e.stopPropagation(); navigate(photoList, currentIndex - 1); },
                }, m('i.fas.fa-chevron-left'))
              : null,
          ]),
          m('.photo-view-img-wrap', [
            imgSrc
              ? m('img.photo-view-img', { src: imgSrc, alt: title })
              : m('.photo-view-no-img', 'No image available'),
          ]),
          m('.photo-view-nav-col', [
            hasNext
              ? m('button.photo-view-nav-btn', {
                  type: 'button',
                  title: 'Next',
                  onclick: (e) => { e.stopPropagation(); navigate(photoList, currentIndex + 1); },
                }, m('i.fas.fa-chevron-right'))
              : null,
          ]),
        ]),

        // Footer: author + date only
        m('.photo-view-footer', [
          m('.photo-view-meta', [
            m('span', 'Posted by '),
            m('b', author),
            dateStr ? m('span', ` \u2022 ${dateStr}`) : null,
          ]),
        ]),
      ]);
    },
  };
}

/**
 * Open PhotoView — renders into a dedicated body-appended overlay.
 * No #modal-container dependency, guaranteed z-index 999999.
 */
function openPhotoModal(photoList, photoIndex) {
  const overlay = getPhotoOverlay();
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '999999',
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });
  m.render(overlay, m(PhotoViewModal, {
    photoList,
    photoIndex,
  }));
}

/**
 * BoardCard Component Factory
 */
function BoardCard() {
  return {
    view: (vnode) => {
      const { item, viewMode, onOpenComments, onOpenPhoto, forumId, voterId } = vnode.attrs;
      if (!item) return null;

      // Extract item properties with fallback defaults
      const title = item.title || item.mMsgName || (item.post && item.post.mMeta && item.post.mMeta.mMsgName) || 'Untitled Post';
      const notes = util.plainText(item.notes || item.mNotes || item.mBody || (item.post && (item.post.mNotes || item.post.mBody)) || '');
      const hasNotes = hasNotesText(notes);

      // Author & Date details
      const meta = (item.post && item.post.mMeta) ? item.post.mMeta : (item.mMeta || {});
      const author = meta.mAuthorId ? meta.mAuthorId.substring(0, 10) : (item.author || 'cluster');
      const publishTs = meta.mPublishTs ? meta.mPublishTs : item.created;
      const dateString = publishTs
        ? (typeof publishTs === 'object' && publishTs.xint64 ? new Date(publishTs.xint64 * 1000).toLocaleString() : new Date(publishTs * 1000).toLocaleString())
        : '';

      // RsPostedPost keeps calculated vote totals on the post, not mMeta.
      const post = item.post || item;
      const upVotes = numberValue(post.mUpVotes !== undefined ? post.mUpVotes : meta.mUpVotes);
      const downVotes = numberValue(post.mDownVotes !== undefined ? post.mDownVotes : meta.mDownVotes);
      const score = upVotes - downVotes;

      // Thumbnail resolution via extractImageSrc
      const thumbnailSrc = extractImageSrc(item);

      // Comment count
      const commentCount = item.commentCount !== undefined
        ? item.commentCount
        : item.mCommentCount !== undefined
        ? item.mCommentCount
        : item.mComments !== undefined
        ? item.mComments
        : (meta.mComments !== undefined
          ? meta.mComments
          : (meta.mChildCount !== undefined ? meta.mChildCount : 0));

      const msgId = item.msgId || item.mMsgId || (item.key ? item.key : null);

      return m(
        '.board-card',
        {
          class: `board-card board-card--${viewMode}`,
          tabindex: 0,
          role: 'article',
          'aria-label': title,
        },
        [
          // Image / Thumbnail Section (Clicking opens PhotoView modal!)
          m(
            '.board-card__image-container',
            {
              title: thumbnailSrc ? 'Click to view photo' : 'View photo',
              style: 'cursor: pointer',
              onclick: (e) => {
                e.stopPropagation();
                if (onOpenPhoto) {
                  onOpenPhoto(item);
                }
              },
            },
            [
              thumbnailSrc
                ? m('img.board-card__image', {
                    src: thumbnailSrc,
                    alt: title,
                    loading: 'lazy',
                    onerror: (e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = 'flex';
                      }
                    },
                  })
                : null,
              m(
                '.board-card__placeholder-wrapper',
                { style: { display: thumbnailSrc ? 'none' : 'flex' } },
                m(FallbackImage)
              ),
            ]
          ),

          // Card Content Body
          m('.board-card__content', [
            // Title (blue link matching Qt GUI)
            m(
              'h4.board-card__title',
              {
                title,
                tabindex: 0,
                onclick: (e) => {
                  e.stopPropagation();
                  if (onOpenComments) {
                    onOpenComments(item, msgId, forumId);
                  }
                },
              },
              title
            ),

            // Metadata Line (Posted by <author> <date>)
            m('.board-card__meta', [
              m('span', 'Posted by '),
              m('b', author),
              dateString ? m('span', ` ${dateString}`) : null,
            ]),

            // Card Actions Line. Notes stay out of the card preview and open in a dedicated dialog.
            m('.board-card__footer', [
              hasNotes ? m(
                'button.board-card__notes-btn[type=button]',
                {
                  title: 'View notes',
                  onclick: (e) => {
                    e.stopPropagation();
                    util.popupmessage(m('.board-notes-dialog', [
                      m('h3', title),
                      m('p.board-notes-dialog__label', 'Notes'),
                      m('p.board-notes-dialog__content', notes),
                    ]));
                  },
                },
                [m('i.fas.fa-sticky-note'), m('span', 'View notes')]
              ) : null,
              m(
                'button.board-card__comments-btn',
                {
                  type: 'button',
                  'aria-label': `View ${commentCount} comments for ${title}`,
                  title: `Comments (${commentCount})`,
                  onclick: (e) => {
                    e.stopPropagation();
                    if (onOpenComments) {
                      onOpenComments(item, msgId, forumId);
                    } else if (msgId && forumId) {
                      m.route.set('/boards/:tab/:mGroupId/:mMsgId', {
                        tab: m.route.param().tab || 'Subscribed',
                        mGroupId: forumId,
                        mMsgId: msgId,
                      });
                    }
                  },
                },
                [
                  m('i.fas.fa-comment-alt.board-card__comments-icon'),
                  m('span.board-card__comments-label', commentCount > 0 ? `${commentCount} comment${commentCount === 1 ? '' : 's'}` : 'Comment'),
                ]
              ),
              m('.board-card__vote-pill', [
                m(
                  'button.board-card__vote-btn.board-card__vote-btn--up[type=button][title=Upvote]',
                  {
                    disabled: !voterId,
                    title: voterId ? 'Upvote' : 'Select a voter identity first',
                    onclick: async (e) => {
                      e.stopPropagation();
                      if (forumId && msgId) {
                        const voted = await util.voteForPost(forumId, msgId, util.GXS_VOTE_UP, voterId);
                        if (voted) {
                          post.mUpVotes = numberValue(post.mUpVotes) + 1;
                          m.redraw();
                        }
                      }
                    },
                  },
                  [m('i.fas.fa-arrow-up')]
                ),
                m('span.board-card__vote-score', score),
                m(
                  'button.board-card__vote-btn.board-card__vote-btn--down[type=button][title=Downvote]',
                  {
                    disabled: !voterId,
                    title: voterId ? 'Downvote' : 'Select a voter identity first',
                    onclick: async (e) => {
                      e.stopPropagation();
                      if (forumId && msgId) {
                        const voted = await util.voteForPost(forumId, msgId, util.GXS_VOTE_DOWN, voterId);
                        if (voted) {
                          post.mDownVotes = numberValue(post.mDownVotes) + 1;
                          m.redraw();
                        }
                      }
                    },
                  },
                  [m('i.fas.fa-arrow-down')]
                ),
              ]),
            ]),
          ]),
        ]
      );
    },
  };
}

/**
 * Toolbar Component Factory
 */
function Toolbar() {
  return {
    view: (vnode) => {
      const {
        viewMode,
        onViewModeChange,
        itemCount,
        searchString,
        onSearchInput,
        currentPage,
        totalPages,
        onPageChange,
        startItem,
        endItem,
        voterIdentities = [],
        voterId,
        voterIdentitiesLoading,
        onVoterIdChange,
      } = vnode.attrs;

      return m('.board-toolbar', { role: 'toolbar', 'aria-label': 'Board View Controls' }, [
        // Left section: Search Filter
        m('.board-toolbar__left', [
          onSearchInput
            ? m('.board-toolbar__search', [
                m('i.fas.fa-search.board-toolbar__search-icon'),
                m('input.board-toolbar__search-input[type=text][placeholder=Search...]', {
                  value: searchString || '',
                  oninput: (e) => onSearchInput(e.target.value),
                }),
              ])
            : null,
        ]),

        // Right section: View Switcher AND Pagination inline
        m('.board-toolbar__right', [
          // View Mode Switcher
          m('.board-toolbar__view-toggle', { role: 'radiogroup', 'aria-label': 'Display Mode' }, [
            m(
              'button.board-toolbar__toggle-btn',
              {
                type: 'button',
                class: viewMode === 'compact' ? 'board-toolbar__toggle-btn--active' : '',
                role: 'radio',
                'aria-checked': viewMode === 'compact',
                title: 'Switch to Compact View',
                onclick: () => onViewModeChange('compact'),
              },
              [
                m('i.fas.fa-bars'),
                m('span', 'Compact View'),
              ]
            ),
            m(
              'button.board-toolbar__toggle-btn',
              {
                type: 'button',
                class: viewMode === 'card' ? 'board-toolbar__toggle-btn--active' : '',
                role: 'radio',
                'aria-checked': viewMode === 'card',
                title: 'Switch to Card View',
                onclick: () => onViewModeChange('card'),
              },
              [
                m('i.fas.fa-th-large'),
                m('span', 'Card View'),
              ]
            ),
          ]),

          // Pagination Controls (< 1 - 25 >)
          itemCount > 0
            ? m('.board-pagination', { 'aria-label': 'Pagination Controls' }, [
                m(
                  'button.board-pagination__btn.board-pagination__btn--prev',
                  {
                    type: 'button',
                    title: 'Previous Page',
                    disabled: currentPage <= 1,
                    onclick: () => onPageChange(currentPage - 1),
                  },
                  m('i.fas.fa-chevron-left')
                ),
                m(
                  'span.board-pagination__label',
                  `${startItem} - ${endItem}`
                ),
                m(
                  'button.board-pagination__btn.board-pagination__btn--next',
                  {
                    type: 'button',
                    title: 'Next Page',
                    disabled: currentPage >= totalPages,
                    onclick: () => onPageChange(currentPage + 1),
                  },
                  m('i.fas.fa-chevron-right')
                ),
              ])
            : null,
          m('.board-toolbar__voter', [
            m('select#board-post-voter', {
              value: voterId || '',
              disabled: voterIdentitiesLoading || voterIdentities.length === 0,
              onchange: (e) => onVoterIdChange && onVoterIdChange(e.target.value),
              title: 'Identity used to vote on posts',
              'aria-label': 'Identity used to vote on posts',
            }, voterIdentities.length > 0
              ? voterIdentities.map((identity) => m('option', { value: identity.id }, identity.label))
              : m('option', { value: '' }, voterIdentitiesLoading ? 'Loading identities...' : 'No identity available')),
          ]),
        ]),
      ]);
    },
  };
}

/**
 * CommentsViewer Modal Trigger — navigates to the boards post detail route
 */
function openCommentsModal(item, msgId, forumId) {
  const tab = m.route.param().tab || 'Subscribed';
  m.route.set('/boards/:tab/:mGroupId/:mMsgId', {
    tab,
    mGroupId: forumId,
    mMsgId: msgId,
  });
}

/**
 * Main BoardView Component Factory
 * Manages view mode (default: compact), search filtering, 25-item page pagination
 */
function BoardView() {
  let viewMode = 'compact';
  let filterText = '';
  let currentPage = 1;

  return {
    view: (vnode) => {
      const {
        items = [], forumId, onOpenComments, voterIdentities = [], voterId,
        voterIdentitiesLoading, onVoterIdChange,
      } = vnode.attrs;

      // Filter items
      const filteredItems = items.filter((item) => {
        if (!filterText.trim()) return true;
        const query = filterText.toLowerCase();
        const title = (item.title || item.mMsgName || (item.post && item.post.mMeta && item.post.mMeta.mMsgName) || '').toLowerCase();
        const notes = (item.notes || item.mNotes || item.mBody || (item.post && (item.post.mNotes || item.post.mBody)) || '').toLowerCase();
        return title.includes(query) || notes.includes(query);
      });

      // Automatically sort posts by publish timestamp descending (newest posts on top)
      filteredItems.sort((a, b) => {
        const getTs = (item) => {
          const p = item.post || item;
          const meta = p.mMeta || item.mMeta || {};
          const ts = meta.mPublishTs || p.mPublishTs || item.created || 0;
          if (ts && typeof ts === 'object' && ts.xint64 !== undefined) return Number(ts.xint64);
          if (typeof ts === 'number') return ts;
          if (typeof ts === 'string') { const n = Number(ts); return isNaN(n) ? 0 : n; }
          return 0;
        };
        return getTs(b) - getTs(a);
      });

      // Pagination math (25 posts max per page)
      const totalFiltered = filteredItems.length;
      const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
      if (currentPage > totalPages) {
        currentPage = totalPages;
      }
      if (currentPage < 1) {
        currentPage = 1;
      }

      const startIndex = (currentPage - 1) * PAGE_SIZE;
      const endIndex = Math.min(startIndex + PAGE_SIZE, totalFiltered);
      const pagedItems = filteredItems.slice(startIndex, endIndex);

      const startItemNum = totalFiltered > 0 ? startIndex + 1 : 0;
      const endItemNum = endIndex;

      // Items with photos for PhotoView modal
      const photoItems = pagedItems.filter((item) => {
        return extractImageSrc(item) !== '';
      });

      const modalPhotos = photoItems.length > 0 ? photoItems : pagedItems;

      return m('.board-view-container', [
        // Top Toolbar with Pagination
        m(Toolbar, {
          key: 'toolbar-node',
          viewMode,
          onViewModeChange: (newMode) => {
            viewMode = newMode;
            m.redraw();
          },
          itemCount: totalFiltered,
          searchString: filterText,
          onSearchInput: (text) => {
            filterText = text;
            currentPage = 1;
          },
          currentPage,
          totalPages,
          onPageChange: (newPage) => {
            currentPage = newPage;
            m.redraw();
          },
          startItem: startItemNum,
          endItem: endItemNum,
          voterIdentities,
          voterId,
          voterIdentitiesLoading,
          onVoterIdChange,
        }),

        // Board Grid (rendering paged slice of 25 items max)
        pagedItems.length > 0
          ? m(
              '.board-grid',
              {
                key: 'grid-node',
                class: `board-grid board-grid--${viewMode}`,
                role: 'region',
                'aria-label': 'Board items',
              },
              pagedItems.map((item, index) => {
                const itemKey = item.key || item.msgId || item.mMsgId || index;
                return m(BoardCard, {
                  key: `card-${itemKey}`,
                  item,
                  viewMode,
                  forumId,
                  voterId,
                  onOpenComments: onOpenComments || ((itemObj, mId, fId) => openCommentsModal(itemObj, mId, fId)),
                  onOpenPhoto: (clickedItem) => {
                    const photoIdx = modalPhotos.findIndex((pi) => {
                      const k1 = pi.key || pi.msgId || pi.mMsgId || (pi.post && pi.post.mMeta && pi.post.mMeta.mMsgId);
                      const k2 = clickedItem.key || clickedItem.msgId || clickedItem.mMsgId || (clickedItem.post && clickedItem.post.mMeta && clickedItem.post.mMeta.mMsgId);
                      return (k1 && k2 && k1 === k2) || pi === clickedItem;
                    });
                    openPhotoModal(modalPhotos, photoIdx >= 0 ? photoIdx : 0);
                  },
                });
              })
            )
          : m('.board-grid__empty', { key: 'empty-node' }, [
              m('i.fas.fa-inbox.board-grid__empty-icon'),
              m('p.board-grid__empty-title', 'No items found'),
              m('p.board-grid__empty-desc', filterText ? 'Try adjusting your search criteria.' : 'This board currently has no posts.'),
            ]),
      ]);
    },
  };
}

module.exports = {
  BoardView,
  BoardCard,
  Toolbar,
  PhotoViewModal,
  openPhotoModal,
  openCommentsModal,
  extractImageSrc,
  hasNotesText,
};
 
}); 
require.register("boards/board_view", function(exports, require, module) { 
const m = require('mithril');
const util = require('boards/boards_util');
const boardKanban = require('boards/board_kanban');
const rs = require('rswebui');
const peopleUtil = require('people/people_util');
const chatEmoji = require('chat/chat_emoji');
const Data = util.Data;

function createboard() {
  let title;
  let body;
  let identity;
  let thumbnail;
  let thumbnailPreview = '';
  let thumbnailFileName = '';
  let circle = util.PUBLIC;
  let circles = [];
  let selectedCircle;
  return {
    oninit: async (vnode) => {
      if (vnode.attrs.authorId) {
        identity = vnode.attrs.authorId[0];
      }
      const res = await rs.rsJsonApiRequest('/rsgxscircles/getCirclesSummaries');
      if (res.body.retval) {
        circles = res.body.circles || [];
        selectedCircle = circles[0];
      }
    },
    view: (vnode) =>
      m('.widget.create-board-form', [
        m('.create-board-form__heading', [
          m('h3', 'Create Board'),
          m('p', 'Set up the board appearance and publishing options.'),
        ]),
        m('input.create-board-form__title[type=text][placeholder=Board title]', {
          oninput: (e) => (title = e.target.value),
        }),
        m('.create-board-form__visual', [
          m('.board-thumbnail-preview', [
            thumbnailPreview
              ? m('img', { src: thumbnailPreview, alt: 'Board thumbnail preview' })
              : m('.board-thumbnail-preview__placeholder', [
                m('i.fas.fa-image'),
                m('span', 'Board logo'),
                m('small', 'No image selected'),
              ]),
          ]),
          m('span.create-board-form__visual-label', 'Thumbnail'),
          m('input.create-board-form__file-input[type=file][id=board-thumbnail][accept=image/*]', {
            onchange: (e) => {
              const file = e.target.files[0];
              if (!file) {
                thumbnail = undefined;
                thumbnailPreview = '';
                thumbnailFileName = '';
                return;
              }
              thumbnailFileName = file.name;
              const reader = new FileReader();
              reader.onloadend = () => {
                thumbnailPreview = reader.result;
                thumbnail = thumbnailPreview.substring(thumbnailPreview.indexOf(',') + 1);
                m.redraw();
              };
              reader.readAsDataURL(file);
            },
          }),
          m('label.create-board-form__file-button[for=board-thumbnail]', {
            title: thumbnailFileName || 'Choose a board thumbnail',
          }, [m('i.fas.fa-upload'), thumbnailPreview ? ' Change image' : ' Choose image']),
          m('small', 'Square images work best.'),
        ]),
        m('.create-board-form__field.create-board-form__identity', [
          m('label[for=idtags]', 'Publishing identity'),
          m('select.config-style-select[id=idtags]', {
            value: identity,
            onchange: (e) => (identity = vnode.attrs.authorId[e.target.selectedIndex]),
          }, vnode.attrs.authorId && vnode.attrs.authorId.map((o) => m(
            'option',
            { value: o },
            Number(o) === 0 ? 'No Signature' : `${rs.userList.username(o)} (${o.slice(0, 8)}...)`
          ))),
        ]),
        m('.create-board-form__field.create-board-form__distribution', [
          m('label[for=circletags]', 'Message distribution'),
          m('select.config-style-select[id=circletags]', {
            value: circle,
            onchange: (e) => (circle = e.target.value),
          }, [
            m('option', { value: util.PUBLIC }, '🌐  Public'),
            m('option', { value: util.EXTERNAL }, '◉  Restricted to External Circle'),
          ]),
        ]),
        Number(circle) === util.EXTERNAL && m('.create-board-form__field.create-board-form__circle', [
          m('label[for=board-circle]', 'Circle'),
          m('select.config-style-select[id=board-circle]', {
            value: selectedCircle && selectedCircle.mGroupId,
            onchange: (e) => {
              selectedCircle = circles.find((item) => item.mGroupId === e.target.value);
            },
          }, circles.length
            ? circles.map((item) => m('option', { value: item.mGroupId }, item.mGroupName))
            : m('option[disabled]', 'No circles available')),
        ]),
        m('textarea.create-board-form__description[rows=5][placeholder=Describe your board]', {
          oninput: (e) => (body = e.target.value),
          value: body,
        }),
        m(
          'button.create-board-form__submit',
          {
            onclick: async () => {
              const res = await rs.rsJsonApiRequest('/rsposted/createBoardV2', {
                board_name: title,
                board_description: body,
                board_image: { mData: { base64: thumbnail } },
                ...(Number(identity) !== 0 && { authorId: identity }),
                circleType: Number(circle),
                ...(Number(circle) === util.EXTERNAL && selectedCircle && {
                  circleId: selectedCircle.mGroupId,
                }),
              });
              if (res.body.retval && vnode.attrs.onCreated) await vnode.attrs.onCreated();
              res.body.retval
                ? util.popupmessage([
                    m('h3', 'Success'),
                    m('hr'),
                    m('p', 'Board created successfully'),
                  ])
                : util.popupmessage([
                    m('h3', 'Error'),
                    m('hr'),
                    m('p', res.body.errorMessage || 'Error in creating Board'),
                  ]);
            },
          },
          'Create'
        ),
      ]),
  };
}

function CreatePost() {
  let mode = 'post';
  let title = '';
  let notes = '';
  let link = '';
  let authorId;
  let identities = [];
  let imageBase64;
  let imagePreview = '';
  let imageFileName = '';
  let imageError = '';
  let submitting = false;

  const readDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const loadImage = (source) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });

  async function preparePostImage(file) {
    const original = await readDataUrl(file);
    const isAnimatedFormat = file.type === 'image/gif' || file.type === 'image/webp';
    if (isAnimatedFormat && file.size <= 194000) return original;

    const sourceImage = await loadImage(original);
    const scale = Math.min(1, 640 / sourceImage.naturalWidth, 480 / sourceImage.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceImage.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceImage.naturalHeight * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);

    let result;
    for (let quality = 0.88; quality >= 0.35; quality -= 0.08) {
      result = canvas.toDataURL('image/jpeg', quality);
      const bytes = Math.ceil((result.length - result.indexOf(',') - 1) * 3 / 4);
      if (bytes <= 190000) return result;
    }
    throw new Error('The image is too large to fit in a Board post.');
  }

  return {
    oninit: async () => {
      identities = (await peopleUtil.ownIds()) || [];
      identities = identities.filter((id) => Number(id) !== 0);
      authorId = identities[0];
      m.redraw();
    },
    view: (vnode) => m('.widget.create-board-post', [
      m('.create-board-post__heading', [
        m('h3', 'Create a Post'),
        m('p', 'Share an interesting post with a clear, descriptive title.'),
      ]),
      m('.create-board-post__modes', [
        ['post', 'fa-comment-alt', 'Post'],
        ['image', 'fa-image', 'Image'],
        ['link', 'fa-link', 'Link'],
      ].map(([value, icon, label]) => m('button[type=button]', {
        class: mode === value ? 'active' : '',
        onclick: () => (mode = value),
      }, [m(`i.fas.${icon}`), ` ${label}`]))),
      m('input.create-board-post__title[type=text][placeholder=Post title]', {
        value: title,
        oninput: (e) => (title = e.target.value),
      }),
      mode === 'link' && m('input.create-board-post__link[type=url][placeholder=https://example.com]', {
        value: link,
        oninput: (e) => (link = e.target.value),
      }),
      mode === 'image' && m('.create-board-post__image', [
        m('.create-board-post__preview', [
          imagePreview
            ? m('img', { src: imagePreview, alt: 'Post image preview' })
            : m('.create-board-post__placeholder', [m('i.fas.fa-image'), m('span', 'Post image')]),
        ]),
        m('input.create-board-post__file[type=file][id=board-post-image][accept=image/*]', {
          onchange: async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            imageFileName = file.name;
            imageError = '';
            try {
              imagePreview = await preparePostImage(file);
              imageBase64 = imagePreview.substring(imagePreview.indexOf(',') + 1);
            } catch (error) {
              imagePreview = '';
              imageBase64 = undefined;
              imageError = error.message || 'The selected image could not be prepared.';
            }
            m.redraw();
          },
        }),
        m('label.create-board-post__file-button[for=board-post-image]', {
          title: imageFileName || 'Choose a post image',
        }, [m('i.fas.fa-upload'), imagePreview ? ' Change image' : ' Choose image']),
        imageError && m('.create-board-post__image-error', imageError),
      ]),
      mode === 'post' && m('textarea.create-board-post__notes[rows=8][placeholder=Text (optional)]', {
        value: notes,
        oninput: (e) => (notes = e.target.value),
      }),
      m('.create-board-post__author', [
        m('label[for=board-post-author]', 'Post as'),
        m('select.config-style-select.network-style-select[id=board-post-author]', {
          value: authorId,
          onchange: (e) => (authorId = e.target.value),
          disabled: identities.length === 0,
        }, identities.length
          ? identities.map((id) => m('option', { value: id }, `${rs.userList.username(id)} (${id.slice(0, 8)}...)`))
          : m('option', 'No signed identity available')),
      ]),
      m('button.create-board-post__submit[type=button]', {
        disabled: submitting || !title.trim() || !authorId ||
          (mode === 'link' && !link.trim()) || (mode === 'image' && !imageBase64),
        onclick: async () => {
          submitting = true;
          m.redraw();
          try {
            const res = await rs.rsJsonApiRequest('/rsposted/createPostV2', {
              boardId: vnode.attrs.boardId,
              title: title.trim(),
              link: { urlString: mode === 'link' ? link.trim() : '' },
              notes: mode === 'link' ? '' : notes,
              authorId,
              image: { mData: { base64: mode === 'image' ? imageBase64 : undefined } },
            });
            if (res.body.retval) {
              Data.Posts[vnode.attrs.boardId] = {};
              await util.updateDisplayBoards(vnode.attrs.boardId);
              util.popupmessage([m('h3', 'Success'), m('hr'), m('p', 'Post created successfully')]);
            } else {
              util.popupmessage([m('h3', 'Error'), m('hr'), m('p',
                res.body.error_message || res.body.errorMessage || 'The post could not be created')]);
            }
          } finally {
            submitting = false;
            m.redraw();
          }
        },
      }, submitting ? 'Posting…' : 'Post'),
    ]),
  };
}

function BoardView() {
  let lastLoadedBoardId = null;
  let voterIdentities = [];
  let voterId = null;
  let voterIdentitiesLoading = true;

  return {
    oninit: (v) => {
      lastLoadedBoardId = v.attrs.id;
      util.updateDisplayBoards(v.attrs.id);
      peopleUtil.ownIds((ids) => {
        voterIdentities = (ids || [])
          .filter((id) => Number(id) !== 0)
          .map((id) => ({
            id,
            label: rs.userList.username(id) || rs.userList.userMap[id] || `${String(id).slice(0, 10)}...`,
          }));
        voterId = voterIdentities[0] ? voterIdentities[0].id : null;
        voterIdentitiesLoading = false;
        m.redraw();
      });
    },
    onupdate: (v) => {
      if (v.attrs.id && v.attrs.id !== lastLoadedBoardId) {
        lastLoadedBoardId = v.attrs.id;
        util.updateDisplayBoards(v.attrs.id);
      }
    },
    view: (v) => {
      const boardInfo = Data.DisplayBoards[v.attrs.id] || {};
      const bname = boardInfo.name || '';
      const bimage = boardInfo.image || { mData: { base64: '' } };
      //  userMap holds {name, isContact} objects: username() is what turns an
      //  id into a string fit for the view.
      let bauthor = 'Unknown';
      if (boardInfo.author) {
        bauthor = Number(boardInfo.author) === 0
          ? 'No Contact Author'
          : rs.userList.username(boardInfo.author);
      }
      const bsubscribed = boardInfo.isSubscribed;
      const subscribeFlags = Number(boardInfo.subscribeFlags || 0);
      const canPublish = (subscribeFlags & (util.GROUP_SUBSCRIBE_ADMIN | util.GROUP_SUBSCRIBE_PUBLISH)) !== 0;
      const bposts = boardInfo.posts || 0;
      const createDate = boardInfo.created;
      const lastActivity = boardInfo.activity;
      const plist = Data.Posts[v.attrs.id] || {};

      const items = Object.keys(plist)
        .filter((key) => plist[key] && (plist[key].isSearched === undefined || plist[key].isSearched))
        .map((key) => {
          const itemObj = plist[key] || {};
          const p = itemObj.post || itemObj;
          const meta = p.mMeta || {};

          let thumb = '';
          if (p.mImage && p.mImage.mData && p.mImage.mData.base64) {
            thumb = p.mImage.mData.base64;
          } else if (p.mImage && typeof p.mImage.base64 === 'string') {
            thumb = p.mImage.base64;
          } else if (typeof p.mImage === 'string') {
            thumb = p.mImage;
          } else if (p.mThumbnail && p.mThumbnail.mData && p.mThumbnail.mData.base64) {
            thumb = p.mThumbnail.mData.base64;
          } else if (typeof p.thumbnail === 'string') {
            thumb = p.thumbnail;
          }

          const notesText = util.plainText(p.mNotes || p.mBody || meta.mNotes || p.notes || p.body || '');
          const titleText = meta.mMsgName || p.mMsgName || p.title || 'Untitled Post';
          // RsPosted exposes the calculated count as mComments on the post.
          const commentCount = p.mComments !== undefined
            ? p.mComments
            : (meta.mChildCount !== undefined
              ? meta.mChildCount
              : (p.mCommentCount !== undefined ? p.mCommentCount : (p.commentCount !== undefined ? p.commentCount : 0)));

          return {
            key,
            msgId: key,
            title: titleText,
            thumbnail: thumb,
            notes: notesText,
            commentCount,
            post: p,
          };
        });

    // Automatically sort posts by publish timestamp descending (newest on top)
    items.sort((a, b) => {
      const getTs = (item) => {
        const p = item.post || item;
        const meta = p.mMeta || item.mMeta || {};
        const ts = meta.mPublishTs || p.mPublishTs || item.created || 0;
        if (ts && typeof ts === 'object' && ts.xint64 !== undefined) return Number(ts.xint64);
        if (typeof ts === 'number') return ts;
        if (typeof ts === 'string') { const n = Number(ts); return isNaN(n) ? 0 : n; }
        return 0;
      };
      return getTs(b) - getTs(a);
    });

      return [
        m(
          'a[title=Back]',
          {
            onclick: () =>
              m.route.set('/boards/:tab', {
                tab: m.route.param().tab || 'Subscribed',
              }),
          },
          m('i.fas.fa-arrow-left')
        ),
        m('.widget__heading', [
          m('h3', bname),
          m(
            'button',
            {
              onclick: async () => {
                const res = await rs.rsJsonApiRequest('/rsposted/subscribeToBoard', {
                  boardId: v.attrs.id,
                  subscribe: !bsubscribed,
                });
                if (res.body.retval) {
                  boardInfo.isSubscribed = !bsubscribed;
                  m.redraw();
                }
              },
            },
            bsubscribed ? 'Subscribed' : 'Subscribe'
          ),
        ]),
        m('.widget__body', [
          m('.media-item', [
            m('.media-item__details', [
              bimage && bimage.mData && bimage.mData.base64
                ? m('img', {
                  src: `data:image/png;base64,${bimage.mData.base64}`,
                  alt: `${bname} board thumbnail`,
                })
                : m('.board-detail-default-thumbnail[role=img][aria-label=Default board thumbnail]',
                  m('i.fas.fa-globe')
                ),
              m('.media-item__details-info', [
                m('div', [m('b', 'Posts: '), m('span', bposts)]),
                m('div', [
                  m('b', 'Date created: '),
                  m(
                    'span',
                    typeof createDate === 'object' && createDate !== null
                      ? new Date(createDate.xint64 * 1000).toLocaleString()
                      : 'Unknown'
                  ),
                ]),
                m('div', [m('b', 'Admin: '), m('span', bauthor)]),
                m('div', [
                  m('b', 'Last activity: '),
                  m(
                    'span',
                    typeof createDate === 'object' && lastActivity !== null && typeof lastActivity === 'object'
                      ? new Date(lastActivity.xint64 * 1000).toLocaleString()
                      : 'Unknown'
                  ),
                ]),
              ]),
            ]),
            m('.media-item__desc', [
              m('b', 'Description: '),
              m('span', boardInfo.description || 'No Description'),
            ]),
          ]),
          m(
            '.posts',
            {
              style: 'display:' + (bsubscribed ? 'block' : 'none'),
            },
            m('.posts__heading.board-posts-heading', [
              m('h3', 'Posts'),
              canPublish && m('button.board-posts-heading__create[type=button][title=Create Post][aria-label=Create Post]', {
                onclick: () => util.popupmessage(
                  m(CreatePost, { boardId: v.attrs.id }),
                  'create-board-post-modal'
                ),
              }, [m('i.fas.fa-plus'), m('span', 'Create Post')]),
            ]),
            m(boardKanban.BoardView, {
              forumId: v.attrs.id,
              items,
              voterIdentities,
              voterId,
              voterIdentitiesLoading,
              onVoterIdChange: (id) => {
                voterId = id || null;
              },
            })
          ),
        ]),
      ];
    },
  };
}

/**
 * PostView: Board post detail page (shown at /boards/:tab/:mGroupId/:mMsgId)
 * Reads from Data.Posts[forumId][msgId]. The Posted API returns comments together
 * with board content, so comments for this post are filtered by their thread id.
 */
function PostView() {
  let comments = [];
  let loadingComments = true;
  let identities = [];
  let authorId = null;
  let voteIdentity = null;
  let postVoteSubmitting = false;
  let replyTo = null;
  let composerText = '';
  let submitting = false;
  let submitError = '';
  let notesExpanded = false;
  let showEmojiPicker = false;
  const expandedReplies = {};

  const metaOf = (comment) => (comment && comment.mMeta) || {};
  const idOf = (comment) => metaOf(comment).mMsgId || comment.msgId || comment.id;
  const parentOf = (comment) => metaOf(comment).mParentId || comment.parentId || '';
  const textOf = (comment) => comment.mComment || comment.comment || comment.mBody || '';
  const nameOf = (id) => !id || Number(id) === 0 ? 'Anonymous' : (rs.userList.username(id) || rs.userList.userMap[id] || `${String(id).slice(0, 10)}…`);
  const timeOf = (value) => {
    const seconds = value && typeof value === 'object' ? value.xint64 : value;
    const date = Number(seconds) ? new Date(Number(seconds) * 1000) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '';
  };

  function treeOfComments() {
    const nodes = {};
    const roots = [];
    comments.forEach((comment) => {
      const id = idOf(comment);
      if (id) nodes[id] = { comment, children: [] };
    });
    Object.keys(nodes).forEach((id) => {
      const node = nodes[id];
      const parent = parentOf(node.comment);
      if (parent && nodes[parent] && parent !== id) nodes[parent].children.push(node);
      else roots.push(node);
    });
    const chronological = (a, b) => Number(metaOf(a.comment).mPublishTs && (metaOf(a.comment).mPublishTs.xint64 || metaOf(a.comment).mPublishTs)) - Number(metaOf(b.comment).mPublishTs && (metaOf(b.comment).mPublishTs.xint64 || metaOf(b.comment).mPublishTs));
    roots.sort(chronological);
    Object.keys(nodes).forEach((id) => nodes[id].children.sort(chronological));
    return roots;
  }

  async function loadComments(forumId, msgId) {
    loadingComments = true;
    comments = [];
    try {
      const res = await rs.rsJsonApiRequest('/rsPosted/getBoardAllContent', { boardId: forumId });
      if (res && res.body && res.body.retval) {
        comments = (res.body.comments || res.body.commentList || []).filter((comment) => {
          const meta = metaOf(comment);
          return meta.mThreadId === msgId || (!meta.mThreadId && meta.mParentId === msgId);
        });
      }
    } catch (e) {
      console.warn('PostView: failed to load comments', e);
    }
    loadingComments = false;
    m.redraw();
  }

  async function submitComment(forumId, msgId) {
    const comment = composerText.trim();
    if (!comment || !authorId || submitting) return;
    submitting = true;
    submitError = '';
    try {
      const res = await rs.rsJsonApiRequest('/rsPosted/createCommentV2', {
        boardId: forumId,
        postId: msgId,
        comment,
        authorId,
        parentId: replyTo ? idOf(replyTo) : msgId,
      });
      if (!res || !res.body || res.body.retval === false) {
        submitError = (res && res.body && res.body.errorMessage) || 'Your comment could not be posted.';
        return;
      }
      composerText = '';
      replyTo = null;
      await loadComments(forumId, msgId);
      await util.updateDisplayBoards(forumId);
    } catch (e) {
      console.warn('PostView: failed to submit comment', e);
      submitError = 'Your comment could not be posted. Please try again.';
    } finally {
      submitting = false;
      m.redraw();
    }
  }

  return {
    oninit: (v) => {
      // Ensure board data is loaded
      if (!Data.Posts[v.attrs.forumId] || !Data.Posts[v.attrs.forumId][v.attrs.msgId]) {
        util.updateDisplayBoards(v.attrs.forumId);
      }
      loadComments(v.attrs.forumId, v.attrs.msgId);

      // A board comment must be signed by one of the user's identities.
      peopleUtil.ownIds((ids) => {
        identities = (ids || []).filter((id) => Number(id) !== 0);
        authorId = identities[0] || null;
        voteIdentity = identities[0] || null;
        m.redraw();
      });
    },
    view: (v) => {
      const { forumId, msgId } = v.attrs;
      const plist = Data.Posts[forumId] || {};
      const itemObj = plist[msgId] || {};
      const p = itemObj.post || itemObj;
      const meta = (p && p.mMeta) ? p.mMeta : {};

      const title = meta.mMsgName || p.mMsgName || p.title || 'Post';
      const notes = util.plainText(p.mNotes || p.mBody || p.notes || p.body || '');
      const hasLongNotes = notes.length > 280;
      const author = meta.mAuthorId ? meta.mAuthorId.substring(0, 10) : 'Unknown';
      const publishTs = meta.mPublishTs || p.mPublishTs || null;
      const dateStr = publishTs
        ? (typeof publishTs === 'object' && publishTs.xint64
            ? new Date(publishTs.xint64 * 1000).toLocaleString()
            : new Date(publishTs * 1000).toLocaleString())
        : '';
      const numberValue = (value) => {
        if (value && typeof value === 'object') return Number(value.xint64 || value.xint32 || 0);
        return Number(value || 0);
      };
      const postUpVotes = numberValue(p.mUpVotes !== undefined ? p.mUpVotes : meta.mUpVotes);
      const postDownVotes = numberValue(p.mDownVotes !== undefined ? p.mDownVotes : meta.mDownVotes);

      let imgSrc = '';
      if (p.mImage && p.mImage.mData && p.mImage.mData.base64 && p.mImage.mData.base64.trim()) {
        imgSrc = `data:image/png;base64,${p.mImage.mData.base64}`;
      } else if (p.mThumbnail && p.mThumbnail.mData && p.mThumbnail.mData.base64 && p.mThumbnail.mData.base64.trim()) {
        imgSrc = `data:image/png;base64,${p.mThumbnail.mData.base64}`;
      }

      return [
        m(
          'a[title=Back]',
          {
            onclick: () =>
              m.route.set('/boards/:tab/:mGroupId', {
                tab: m.route.param().tab || 'Subscribed',
                mGroupId: forumId,
              }),
          },
          m('i.fas.fa-arrow-left')
        ),
        m('.widget__heading', m('h3', title)),
        m('.widget__body', [
          imgSrc
            ? m('img', {
                src: imgSrc,
                alt: title,
                style: { maxWidth: '100%', maxHeight: '400px', display: 'block', marginBottom: '1rem', borderRadius: '8px' },
              })
            : null,
          m('.board-post-meta', [
            m('span', 'Posted by '),
            m('b', author),
            dateStr ? m('span', ` • ${dateStr}`) : null,
          ]),
          m('.board-post-voting', [
            m('.board-post-voting__identity', [
              m('label[for=board-post-voter]', 'Vote as'),
              m('select#board-post-voter', {
                value: voteIdentity || '',
                disabled: identities.length === 0 || postVoteSubmitting,
                onchange: (e) => { voteIdentity = e.target.value; },
              }, identities.length
                ? identities.map((id) => m('option', { value: id }, nameOf(id)))
                : m('option', { value: '' }, 'Loading identities…')),
            ]),
            m('.board-post-voting__buttons', [
              m('button[type=button][title=Upvote post]', {
                disabled: !voteIdentity || postVoteSubmitting,
                onclick: async () => {
                  postVoteSubmitting = true;
                  m.redraw();
                  await util.voteForPost(forumId, msgId, util.GXS_VOTE_UP, voteIdentity);
                  postVoteSubmitting = false;
                  m.redraw();
                },
              }, [m('i.fas.fa-arrow-up'), ` ${postUpVotes}`]),
              m('span.board-post-voting__score', postUpVotes - postDownVotes),
              m('button[type=button][title=Downvote post]', {
                disabled: !voteIdentity || postVoteSubmitting,
                onclick: async () => {
                  postVoteSubmitting = true;
                  m.redraw();
                  await util.voteForPost(forumId, msgId, util.GXS_VOTE_DOWN, voteIdentity);
                  postVoteSubmitting = false;
                  m.redraw();
                },
              }, [m('i.fas.fa-arrow-down'), ` ${postDownVotes}`]),
            ]),
          ]),
          notes ? m('.post-description.board-post-description', [
            m('.post-description__text', { class: notesExpanded ? '' : 'post-description__text--collapsed', style: { whiteSpace: 'pre-wrap', maxHeight: notesExpanded ? 'none' : '4.5em', overflow: 'hidden', lineHeight: '1.5' } }, notes),
            hasLongNotes ? m('button.post-description__toggle[type=button]', { onclick: () => { notesExpanded = !notesExpanded; } }, notesExpanded ? 'Show less' : '…more') : null,
          ]) : null,
          m('hr'),
          m('.board-comments', [
            m('.board-comments__heading', [
              m('h3', `${comments.length} Comment${comments.length === 1 ? '' : 's'}`),
              m('span', [m('i.fas.fa-sort-amount-down'), ' Oldest first']),
            ]),
            m('.board-comment-composer', [
              m('.board-comment-avatar', m(peopleUtil.IdentityAvatar, {
                identityId: authorId,
                name: nameOf(authorId),
                size: '100%',
              })),
              m('.board-comment-composer__body', [
                replyTo ? m('.board-comment-composer__replying', ['Replying to ', m('b', nameOf(metaOf(replyTo).mAuthorId)), m('button[type=button][aria-label=Cancel reply]', { onclick: () => { replyTo = null; composerText = ''; } }, m('i.fas.fa-times'))]) : null,
                identities.length ? m('select.board-comment-composer__identity', { value: authorId, onchange: (e) => { authorId = e.target.value; } }, identities.map((id) => m('option', { value: id }, nameOf(id)))) : null,
                m('textarea.board-comment-composer__input[rows=1][placeholder=Add a comment…]', { value: composerText, disabled: !authorId || submitting, oninput: (e) => { composerText = e.target.value; }, onkeydown: (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submitComment(forumId, msgId); } }),
                !authorId ? m('p.board-comment-composer__hint', 'Create or select an identity to post a comment.') : null,
                submitError ? m('p.board-comment-composer__error', submitError) : null,
                m('.board-comment-composer__actions', [
                  m('.board-comment-composer__emoji', { style: { position: 'relative', marginRight: 'auto' } }, [
                    m('button[type=button][title=Insert emoji][aria-label=Insert emoji]', { style: { width: '32px', height: '32px', padding: '0', borderRadius: '50%', border: '0', boxShadow: 'none', background: showEmojiPicker ? '#e0f2fe' : 'transparent', color: '#475569', fontSize: '1.15rem' }, onclick: () => { showEmojiPicker = !showEmojiPicker; } }, m('i.fas.fa-smile')),
                    showEmojiPicker ? m('.board-comment-emoji-popover', { style: { position: 'absolute', zIndex: '20', top: '38px', left: '0', width: '250px', maxHeight: '180px', overflowY: 'auto', padding: '.5rem', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '.2rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 8px 20px rgba(0,0,0,.16)' } }, chatEmoji.EMOJI_DATA.Smileys.slice(0, 48).map((emoji) => m('button[type=button]', { style: { width: '28px', height: '28px', padding: '0', border: '0', boxShadow: 'none', background: 'transparent', fontSize: '1.1rem' }, onclick: () => { composerText += emoji; showEmojiPicker = false; } }, emoji))) : null,
                  ]),
                  composerText || replyTo ? m('button.board-comment-composer__cancel[type=button]', { onclick: () => { composerText = ''; replyTo = null; submitError = ''; } }, 'Cancel') : null,
                  m('button.board-comment-composer__submit[type=button]', { disabled: !composerText.trim() || !authorId || submitting, onclick: () => submitComment(forumId, msgId) }, submitting ? 'Posting…' : 'Comment')
                ])
              ])
            ]),
            loadingComments ? m('.board-comments__status', [m('i.fas.fa-spinner.fa-spin'), ' Loading comments…'])
              : comments.length === 0 ? m('.board-comments__empty', [m('i.fas.fa-comment'), m('p', 'No comments yet. Start the conversation.')])
              : m('.board-comments__list', treeOfComments().map((node) => renderComment(node, 0, forumId, msgId))),
          ]),
        ]),
      ];
    },
  };

  function renderComment(node, depth, forumId, msgId) {
    const comment = node.comment;
    const key = idOf(comment);
    const meta = metaOf(comment);
    const name = nameOf(meta.mAuthorId);
    const repliesCount = node.children.length;
    const repliesExpanded = expandedReplies[key] === true;
    return m('.board-comment', { key: idOf(comment), class: depth ? 'board-comment--reply' : '' }, [
      m('.board-comment-avatar', m(peopleUtil.IdentityAvatar, {
        identityId: meta.mAuthorId,
        name,
        size: '100%',
      })),
      m('.board-comment__content', [
        m('.board-comment__header', [
          m('.board-comment__meta', [m('b', name), timeOf(meta.mPublishTs) ? m('span', timeOf(meta.mPublishTs)) : null]),
          m('button.board-comment__menu[type=button][aria-label=Comment options][title=Comment options]', m('i.fas.fa-ellipsis-v')),
        ]),
        m('p.board-comment__text', textOf(comment)),
        m('.board-comment__actions', [
          m('button[type=button]', {
            disabled: !voteIdentity,
            onclick: () => util.voteForComment(forumId, msgId, key, util.GXS_VOTE_UP, voteIdentity),
          }, [m('i.fas.fa-thumbs-up'), ` ${comment.mUpVotes || 0}`]),
          m('button[type=button]', {
            disabled: !voteIdentity,
            onclick: () => util.voteForComment(forumId, msgId, key, util.GXS_VOTE_DOWN, voteIdentity),
          }, m('i.fas.fa-thumbs-down')),
          m('button[type=button]', { onclick: () => { replyTo = comment; composerText = ''; submitError = ''; } }, 'Reply')
        ]),
        repliesCount ? m('button.board-comment__replies-toggle[type=button]', {
          'aria-expanded': repliesExpanded,
          onclick: () => { expandedReplies[key] = !repliesExpanded; },
        }, [
          `${repliesCount} ${repliesCount === 1 ? 'reply' : 'replies'} `,
          m('i.fas', { class: repliesExpanded ? 'fa-chevron-up' : 'fa-chevron-down' }),
        ]) : null,
        repliesCount && repliesExpanded
          ? m('.board-comment__replies', node.children.map((reply) => renderComment(reply, depth + 1, forumId, msgId)))
          : null,
      ])
    ]);
  }
}

module.exports = {
  BoardView,
  PostView,
  createboard,
};
 
}); 
require.register("boards/my_boards", function(exports, require, module) { 
const m = require('mithril');
const util = require('boards/boards_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'My Boards')),
      m('.widget__body', [
        m(
          util.BoardTable,
          m('tbody', [
            v.attrs.list &&
              v.attrs.list.map((board) =>
                m(util.BoardSummary, {
                  key: board.mGroupId,
                  details: board,
                  category: 'MyBoards',
                })
              ),
          ])
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("boards/other_boards", function(exports, require, module) { 
const m = require('mithril');
const util = require('boards/boards_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Other Boards')),
      m('.widget__body', [
        m(
          util.BoardTable,
          m('tbody', [
            v.attrs.list &&
              v.attrs.list.map((board) =>
                m(util.BoardSummary, {
                  key: board.mGroupId,
                  details: board,
                  category: 'Other',
                })
              ),
          ])
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("boards/popular_boards", function(exports, require, module) { 
const m = require('mithril');
const util = require('boards/boards_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Popular Boards')),
      m('.widget__body', [
        m(
          util.BoardTable,
          m('tbody', [
            v.attrs.list &&
              v.attrs.list.map((board) =>
                m(util.BoardSummary, {
                  key: board.mGroupId,
                  details: board,
                  category: 'Popular',
                })
              ),
          ])
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("boards/subscribed_boards", function(exports, require, module) { 
const m = require('mithril');
const util = require('boards/boards_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Subscribed Boards')),
      m('.widget__body', [
        m(
          util.BoardTable,
          m('tbody', [
            v.attrs.list &&
              v.attrs.list.map((board) =>
                m(util.BoardSummary, {
                  key: board.mGroupId,
                  details: board,
                  category: 'Subscribed',
                })
              ),
          ])
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("channels/channels", function(exports, require, module) { 
const m = require('mithril');
const widget = require('widgets');
const rs = require('rswebui');
const util = require('channels/channels_util');
const viewUtil = require('channels/channel_view');
const peopleUtil = require('people/people_util');

const getChannels = {
  All: [],
  Popular: [],
  Subscribed: [],
  MyChannels: [],
  Other: [],
  async load() {
    try {
      const res = await rs.rsJsonApiRequest('/rsgxschannels/getChannelsSummaries');
      const channels = res && res.body && Array.isArray(res.body.channels) ? res.body.channels : null;
      if (!channels) {
        console.warn('Channels summaries response did not include channels', res && res.body);
        return;
      }
      getChannels.All = channels;
      getChannels.Subscribed = channels.filter(
      (channel) =>
        channel.mSubscribeFlags === util.GROUP_SUBSCRIBE_SUBSCRIBED ||
        channel.mSubscribeFlags === util.GROUP_MY_CHANNEL // my channel is subscribed
      );
      const popular = channels.filter((channel) => !getChannels.Subscribed.includes(channel));
      popular.sort((a, b) => (b.mPop || 0) - (a.mPop || 0));
      getChannels.Other = popular.slice(5);
      getChannels.Popular = popular.slice(0, 5);

      getChannels.MyChannels = channels.filter(
        (channel) => channel.mSubscribeFlags === util.GROUP_MY_CHANNEL
      );
      m.redraw();
    } catch (error) {
      console.warn('Failed to load channel summaries', error);
    }
  },
};

const sections = {
  MyChannels: require('channels/my_channels'),
  Subscribed: require('channels/subscribed_channels'),
  Popular: require('channels/popular_channels'),
  Other: require('channels/other_channels'),
};

const Layout = () => {
  let ownId;

  return {
    oninit: () => {
      rs.setBackgroundTask(getChannels.load, 5000, () => {
        // return m.route.get() === '/files/files';
      });
      peopleUtil.ownIds((data) => {
        ownId = data;
        for (let i = 0; i < ownId.length; i++) {
          if (Number(ownId[i]) === 0) {
            ownId.splice(i, 1);
          }
        }
        ownId.unshift(0); // we need an extra check when a channel is created with no identity.
      });
    },
    // onupdate: getChannels.load,
    view: (vnode) =>
      m('.widget', [
        m('.top-heading', [
          m(
            'button',
            {
              onclick: () =>
                ownId &&
                widget.popupMessage(
                  m(viewUtil.createchannel, {
                    authorId: ownId,
                    onCreated: getChannels.load,
                  }),
                  'create-channel-modal'
                ),
            },
            'Create Channel'
          ),
          Object.prototype.hasOwnProperty.call(vnode.attrs.pathInfo, 'mMsgId')
            ? ''
            : Object.prototype.hasOwnProperty.call(vnode.attrs.pathInfo, 'mGroupId')
            ? m(util.SearchBar, {
                category: 'posts',
                channelId: vnode.attrs.pathInfo.mGroupId,
              })
            : m(util.SearchBar, {
                category: 'channels',
              }),
        ]),
        Object.prototype.hasOwnProperty.call(vnode.attrs.pathInfo, 'mMsgId') // posts
          ? m(viewUtil.PostView, {
              msgId: vnode.attrs.pathInfo.mMsgId,
              channelId: vnode.attrs.pathInfo.mGroupId,
            })
          : Object.prototype.hasOwnProperty.call(vnode.attrs.pathInfo, 'mGroupId') // channels view
          ? m(viewUtil.ChannelView, {
              id: vnode.attrs.pathInfo.mGroupId,
            })
          : m(sections[vnode.attrs.pathInfo.tab], {
              // subscribed, all, popular, other
              list: getChannels[vnode.attrs.pathInfo.tab],
            }),
      ]),
  };
};

module.exports = {
  view: (vnode) => {
    return [
      m(widget.Sidebar, {
        tabs: Object.keys(sections),
        baseRoute: '/channels/',
        mobileDrawer: true,
      }),
      m('.node-panel', m(Layout, { pathInfo: vnode.attrs })),
    ];
  },
};
 
}); 
require.register("channels/channels_util", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');

// rstypes.h:96
const GROUP_SUBSCRIBE_ADMIN = 0x01; //  means: you have the admin key for this group
const GROUP_SUBSCRIBE_PUBLISH = 0x02; //  means: you have the publish key for thiss group. Typical use: publish key in channels are shared with specific friends.
const GROUP_SUBSCRIBE_SUBSCRIBED = 0x04; //  means: you are subscribed to a group, which makes you a source for this group to your friend nodes.
const GROUP_SUBSCRIBE_NOT_SUBSCRIBED = 0x08;

const GROUP_MY_CHANNEL =
  GROUP_SUBSCRIBE_ADMIN + GROUP_SUBSCRIBE_SUBSCRIBED + GROUP_SUBSCRIBE_PUBLISH;

// rsfiles.h:168
const RS_FILE_REQ_ANONYMOUS_ROUTING = 0x00000040;

// rsgxscommon.h:194
const GXS_VOTE_DOWN = 0x0001;
const GXS_VOTE_UP = 0x0002;

// rsgxscircles.h:50
const PUBLIC = 1; // Public distribution
const EXTERNAL = 2; // Restricted to an external circle, based on GxsIds
const NODES_GROUP = 3;

const Data = {
  DisplayChannels: {}, // chanID -> channel info
  Posts: {}, // chanID, PostID -> {post, isSearched}
  Comments: {}, // threadID, msgID -> {Comment, showReplies}
  TopComments: {}, // threadID, msgID -> comment(Top thread comment)
  ParentCommentMap: {}, // stores replies of a comment threadID, msgID -> comment
  Votes: {},
};

//  getChannelContent takes a set of ids, so a whole channel is fetched in a few
//  requests instead of one per item. Chunked rather than sent as a single call so
//  that no request grows unbounded and so the UI can paint as batches land.
const CONTENT_BATCH_SIZE = 25;

function storePost(post, channelid) {
  const msgId = post.mMeta && post.mMeta.mMsgId;
  if (!msgId) {
    return;
  }
  Data.Posts[channelid][msgId] = { post, isSearched: true };
}

function storeComment(comm) {
  const meta = comm.mMeta;
  if (!meta) {
    return;
  }
  if (Data.Comments[meta.mThreadId] === undefined) {
    Data.Comments[meta.mThreadId] = {};
  }
  Data.Comments[meta.mThreadId][meta.mMsgId] = { comment: comm, showReplies: false }; //  Comments[post][comment]
  if (Data.TopComments[meta.mThreadId] === undefined) {
    Data.TopComments[meta.mThreadId] = {};
  }
  if (meta.mThreadId === meta.mParentId) {
    // this is a check for the top level comments
    Data.TopComments[meta.mThreadId][meta.mMsgId] = comm;
    //  pushing top comments respective to post
  } else {
    if (Data.ParentCommentMap[meta.mParentId] === undefined) {
      Data.ParentCommentMap[meta.mParentId] = {};
    }
    Data.ParentCommentMap[meta.mParentId][meta.mMsgId] = comm;
  }
}

function storeVote(vote) {
  const meta = vote.mMeta;
  if (!meta) {
    return;
  }
  if (Data.Votes[meta.mThreadId] === undefined) {
    Data.Votes[meta.mThreadId] = {};
  }
  if (Data.Votes[meta.mThreadId][meta.mParentId] === undefined) {
    Data.Votes[meta.mThreadId][meta.mParentId] = { upvotes: 0, downvotes: 0 };
  }
  if (vote.mVoteType === GXS_VOTE_UP) {
    Data.Votes[meta.mThreadId][meta.mParentId].upvotes += 1;
  }

  if (vote.mVoteType === GXS_VOTE_DOWN) {
    Data.Votes[meta.mThreadId][meta.mParentId].downvotes += 1;
  }
}

async function updatecontent(contentIds, channelid) {
  const ids = Array.isArray(contentIds) ? contentIds : [contentIds];
  if (ids.length === 0) {
    return true;
  }
  const res = await rs.rsJsonApiRequest('/rsgxschannels/getChannelContent', {
    channelId: channelid,
    contentsIds: ids,
  });
  //  rsJsonApiRequest resolves to undefined when the request never made it out
  if (!res || !res.body || !res.body.retval) {
    return false;
  }
  //  A batch mixes the three kinds, so all three lists have to be walked. The
  //  metadata of each item is used rather than the summary it was asked from.
  (res.body.posts || []).forEach((post) => storePost(post, channelid));
  (res.body.comments || []).forEach(storeComment);
  (res.body.votes || []).forEach(storeVote);
  return true;
}

// Large posts can contain base64 media. If RetroShare truncates a response,
// retry it as two smaller requests until the problematic batch is isolated.
async function updateContentBatch(contentIds, channelid) {
  const loaded = await updatecontent(contentIds, channelid);
  //  Splitting only makes sense against a core that answers: when it is gone,
  //  every half fails too and one batch of 25 turns into 49 doomed requests.
  //  connectionState stays true when a 200 arrived but its body was cut short,
  //  which is exactly the case worth retrying smaller.
  if (loaded || contentIds.length <= 1 || !rs.connectionState.status) {
    if (!loaded) {
      console.warn('Unable to load channel content item', contentIds[0]);
    }
    return;
  }

  const middle = Math.ceil(contentIds.length / 2);
  await updateContentBatch(contentIds.slice(0, middle), channelid);
  await updateContentBatch(contentIds.slice(middle), channelid);
}

async function updatedisplaychannels(keyid, details, loadContent = true) {
  const res1 = await rs.rsJsonApiRequest('/rsgxschannels/getChannelsInfo', {
    chanIds: [keyid],
  });
  if (!res1 || !res1.body || !Array.isArray(res1.body.channelsInfo) || !res1.body.channelsInfo[0]) {
    return;
  }
  details = res1.body.channelsInfo[0];
  Data.DisplayChannels[keyid] = {
    // struct for a channel
    name: details.mMeta.mGroupName,
    isSearched: true,
    description: details.mDescription,
    image: details.mImage,
    author: details.mMeta.mAuthorId,
    isSubscribed:
      details.mMeta.mSubscribeFlags === GROUP_SUBSCRIBE_SUBSCRIBED ||
      details.mMeta.mSubscribeFlags === GROUP_MY_CHANNEL,
    mychannel: details.mMeta.mSubscribeFlags === GROUP_MY_CHANNEL,
    posts: details.mMeta.mVisibleMsgCount,
    activity: details.mMeta.mLastPost,
    created: details.mMeta.mPublishTs,
  };

  if (Data.Posts[keyid] === undefined) {
    Data.Posts[keyid] = {};
  }
  // Channel lists only need metadata. Fetching every post, comment, vote and
  // embedded image for every listed channel made large lists extremely slow.
  if (!loadContent) {
    return;
  }
  const res2 = await rs.rsJsonApiRequest('/rsgxschannels/getContentSummaries', {
    channelId: keyid,
  });

  if (!res2 || !res2.body || !res2.body.retval || !Array.isArray(res2.body.summaries)) {
    return;
  }

  const ids = res2.body.summaries.map((content) => content.mMsgId).filter(Boolean);
  //  Sequential on purpose: this runs once per channel of the list, so firing the
  //  batches concurrently would put the browser back where it started.
  for (let i = 0; i < ids.length; i += CONTENT_BATCH_SIZE) {
    await updateContentBatch(ids.slice(i, i + CONTENT_BATCH_SIZE), keyid);
    m.redraw();
  }
}
const DisplayChannelsFromList = () => {
  return {
    oninit: (v) => {},
    view: (v) =>
      m(
        'tr',
        {
          key: v.attrs.id,
          class:
            Data.DisplayChannels[v.attrs.id] && Data.DisplayChannels[v.attrs.id].isSearched
              ? ''
              : 'hidden',
          onclick: () => {
            m.route.set('/channels/:tab/:mGroupId', {
              tab: v.attrs.category,
              mGroupId: v.attrs.id,
            });
          },
        },
        [m('td', Data.DisplayChannels[v.attrs.id] ? Data.DisplayChannels[v.attrs.id].name : '')]
      ),
  };
};

const ChannelSummary = () => {
  let keyid = {};
  return {
    oninit: (v) => {
      keyid = v.attrs.details.mGroupId;
      updatedisplaychannels(keyid, undefined, false);
    },

    view: (v) => {},
  };
};

const CommentsTable = () => {
  return {
    oninit: (v) => {},
    view: (v) =>
      m('table.comments', [
        m('tr', [
          m('th', ''),
          m('th', 'Comment'),
          m('th', 'Author'),
          m('th', 'Date'),
          m('th', 'Score'),
          m('th', 'Upvotes'),
          m('th', 'DownVotes'),
          m('th', 'OwnVote'),
        ]),
        v.children,
      ]),
  };
};

const FilesTable = () => {
  return {
    oninit: (v) => {},
    view: (v) =>
      m('table.files.channel-files', [
        m('thead', m('tr', [m('th', 'File Name'), m('th', 'Size'), m('th', m('i.fas.fa-download'))])),
        v.children,
      ]),
  };
};

const ChannelTable = () => {
  return {
    view: (v) => m('table.channels', [m('tr', [m('th', 'Channel Name')]), v.children]),
  };
};
const SearchBar = () => {
  // same search bar is used for both channels and posts
  let searchString = '';
  return {
    view: (v) =>
      m('input[type=text][placeholder=Search Subject].searchbar', {
        value: searchString,
        placeholder:
          v.attrs.category.localeCompare('channels') === 0 ? 'Search Channels' : 'Search Posts',
        oninput: (e) => {
          searchString = e.target.value.toLowerCase();
          if (v.attrs.category.localeCompare('channels') === 0) {
            // for channels
            for (const hash in Data.DisplayChannels) {
              if (Data.DisplayChannels[hash].name.toLowerCase().indexOf(searchString) > -1) {
                Data.DisplayChannels[hash].isSearched = true;
              } else {
                Data.DisplayChannels[hash].isSearched = false;
              }
            }
          } else {
            for (const hash in Data.Posts[v.attrs.channelId]) {
              // for posts
              if (
                Data.Posts[v.attrs.channelId][hash].post.mMeta.mMsgName
                  .toLowerCase()
                  .indexOf(searchString) > -1
              ) {
                Data.Posts[v.attrs.channelId][hash].isSearched = true;
              } else {
                Data.Posts[v.attrs.channelId][hash].isSearched = false;
              }
            }
          }
        },
      }),
  };
};

module.exports = {
  Data,
  SearchBar,
  ChannelSummary,
  DisplayChannelsFromList,
  updatedisplaychannels,
  ChannelTable,
  FilesTable,
  CommentsTable,
  GROUP_SUBSCRIBE_ADMIN,
  GROUP_SUBSCRIBE_NOT_SUBSCRIBED,
  GROUP_SUBSCRIBE_PUBLISH,
  GROUP_SUBSCRIBE_SUBSCRIBED,
  GROUP_MY_CHANNEL,
  GXS_VOTE_DOWN,
  GXS_VOTE_UP,
  PUBLIC,
  EXTERNAL,
  NODES_GROUP,
  RS_FILE_REQ_ANONYMOUS_ROUTING,
};
 
}); 
require.register("channels/channel_view", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const util = require('channels/channels_util');
const widget = require('widgets');
const Data = util.Data;
const peopleUtil = require('people/people_util');
const sha1 = require('channels/sha1');
const fileUtil = require('files/files_util');
const fileDown = require('files/files_downloads');
const chatEmoji = require('chat/chat_emoji');

const filesUploadHashes = {
  // figure out a better way later.
  PostFiles: [],
  Thumbnail: [],
};

function channelThumbnailSrc(post) {
  const thumbnail = post && (post.mThumbnail || post.thumbnail || post.mImage);
  const base64 = thumbnail && thumbnail.mData && thumbnail.mData.base64
    ? thumbnail.mData.base64
    : typeof thumbnail === 'string'
      ? thumbnail
      : thumbnail && thumbnail.base64;
  if (!base64 || !String(base64).trim()) return '';
  return String(base64).startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
}

function channelPostCommentCount(postId, post) {
  const loadedComments = Data.Comments[postId];
  if (loadedComments) return Object.keys(loadedComments).length;

  const meta = (post && post.mMeta) || {};
  const count = post && (post.mComments ?? post.mCommentCount ?? post.commentCount);
  return Number(count ?? meta.mComments ?? meta.mCommentCount ?? 0) || 0;
}

const ChannelFallbackThumbnail = () => ({
  view: (vnode) => m('.channel-post__placeholder', { style: {
    display: vnode.attrs.hidden ? 'none' : 'flex', flex: '1 1 auto', minHeight: '0',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '.35rem',
    color: '#64748b', background: 'linear-gradient(135deg, #f8fafc, #dbe5f1)',
  } }, [
    m('i.fas.fa-image[aria-hidden=true]', { style: { fontSize: '1.35rem', color: '#64748b' } }),
    m('span', { style: { fontSize: '2rem', fontWeight: '700', color: '#2563eb' } }, (vnode.attrs.title || 'Post').trim().slice(0, 1).toUpperCase()),
    m('small', { style: { fontSize: '.72rem', fontWeight: '600' } }, 'No image'),
  ]),
});

async function parsefile(file, type) {
  const fileSize = file.size;
  const chunkSize = 1024 * 1024; // bytes
  let offset = 0;
  let chunkreaderblock = null;
  const hash = sha1.create();
  const ansList = [];

  // const readEventHandler = async function (evt) {
  //   if (evt.target.error == null) {
  //     offset += evt.target.result.length;
  //     await hash.update(evt.target.result);
  //   } else {
  //     console.log('Read error: ' + evt.target.error);
  //     return;
  //   }
  //   if (offset >= fileSize) {
  //     const ans = await hash.hex();
  //     console.log(ans);
  //     ansList.push(ans);
  //     if (type.localeCompare('multiple') === 0) {
  //       filesUploadHashes.PostFiles.push(ans);
  //     } else {
  //       filesUploadHashes.Thumbnail.push(ans);
  //     }
  //     return;
  //   }

  //   // of to the next chunk
  //   await chunkreaderblock(offset, chunkSize, file);
  //   return ansList;
  // };

  chunkreaderblock = async function (_offset, length, _file) {
    // const reader = new FileReader();
    const blob = await _file.slice(_offset, length + _offset);
    const data = await blob.text();
    offset += data.length;
    await hash.update(data);
    if (offset >= fileSize) {
      const ans = await hash.hex();
      // console.log(ans);
      // ansList.push(ans);
      if (type.localeCompare('multiple') === 0) {
        filesUploadHashes.PostFiles.push(ans);
      } else {
        filesUploadHashes.Thumbnail.push(ans);
      }
      return;
    }

    // of to the next chunk
    await chunkreaderblock(offset, chunkSize, file);
  };

  // read with the first block
  await chunkreaderblock(offset, chunkSize, file);
  return ansList;
}
const messageGroups = ['Public', 'Restricted Circle', 'Restricted Node Group'];
const messageGroupLabels = ['🌐  Public', '◉  Restricted Circle', '⬢  Restricted Node Group'];
const messageGroupsCode = [util.PUBLIC, util.EXTERNAL, util.NODES_GROUP]; // rsgxscirles.h:50

function createchannel() {
  let title;
  let body;
  let identity;
  let thumbnail;
  let thumbnailPreview = '';
  let thumbnailFileName = '';
  let selectedGroup = messageGroups[0];
  let selectedGroupCode = messageGroupsCode[0];
  let selectedCircle;
  let circles;
  return {
    oninit: async (vnode) => {
      if (vnode.attrs.authorId) {
        identity = vnode.attrs.authorId[0];
      }

      const res = await rs.rsJsonApiRequest('/rsgxscircles/getCirclesSummaries');
      if (res.body.retval) {
        circles = res.body.circles;
        selectedCircle = circles[0];
      }
    },
    view: (vnode) =>
      m('.widget.create-channel-form', [
        m('.create-channel-form__heading', [
          m('h3', 'Create Channel'),
          m('p', 'Set up the channel appearance and publishing options.'),
        ]),
        m('input.create-channel-form__title[type=text][placeholder=Channel title]', {
          oninput: (e) => (title = e.target.value),
        }),
        m('.create-channel-form__thumbnail', [
          m('.channel-thumbnail-preview', [
            thumbnailPreview
              ? m('img', { src: thumbnailPreview, alt: 'Channel thumbnail preview' })
              : m('.channel-thumbnail-preview__placeholder', [
                m('i.fas.fa-image'),
                m('span', 'Channel logo'),
                m('small', 'No image selected'),
              ]),
          ]),
          m('span.create-channel-form__thumbnail-label', 'Thumbnail'),
          m('input.create-channel-form__file-input[type=file][name=files][id=thumbnail][accept=image/*]', {
            onchange: async (e) => {
              const file = e.target.files[0];
              if (!file) {
                thumbnail = undefined;
                thumbnailPreview = '';
                thumbnailFileName = '';
                return;
              }
              thumbnailFileName = file.name;
              const reader = new FileReader();
              reader.onloadend = function () {
                thumbnailPreview = reader.result;
                thumbnail = thumbnailPreview.substring(thumbnailPreview.indexOf(',') + 1);
                m.redraw();
              };
              reader.readAsDataURL(file);
            },
          }),
          m('label.create-channel-form__file-button[for=thumbnail]', {
            title: thumbnailFileName || 'Choose a channel thumbnail',
          }, [m('i.fas.fa-upload'), thumbnailPreview ? ' Change image' : ' Choose image']),
          m('small', 'Square images work best.'),
        ]),

        m('.create-channel-form__field.create-channel-form__identity', [
          m('label[for=idtags]', 'Publishing identity'),
          m(
            'select.config-style-select[id=idtags]',
            {
              value: identity,
              onchange: (e) => {
                identity = vnode.attrs.authorId[e.target.selectedIndex];
              },
            },
            [
              vnode.attrs.authorId &&
                vnode.attrs.authorId.map((o) =>
                  m(
                    'option',
                    { value: o },
                    Number(o) === 0
                      ? 'No Signature'
                      : `${rs.userList.username(o)} (${o.slice(0, 8)}...)`
                  )
                ),
            ]
          ),
        ]),
        m('.create-channel-form__field.create-channel-form__distribution', [
          m('label[for=mtags]', 'Message distribution'),
          m(
            'select.config-style-select[id=mtags]',
            {
              value: selectedGroup,
              onchange: (e) => {
                selectedGroup = messageGroups[e.target.selectedIndex];
                selectedGroupCode = messageGroupsCode[e.target.selectedIndex];
              },
            },
            [messageGroups.map((group, index) => m(
              'option',
              { value: group },
              messageGroupLabels[index]
            ))]
          ),
        ]),
        circles && selectedGroupCode === util.EXTERNAL &&
          m(
            '.create-channel-form__field.create-channel-form__circle',
            [
              m('label[for=circlestag]', 'Circle'),
              m(
                'select.config-style-select[id=circlestag]',
                {
                  value: selectedCircle && selectedCircle.mGroupName,
                  onchange: (e) => {
                    selectedCircle = circles[e.target.selectedIndex];
                  },
                },
                [
                  circles.map((circle) =>
                    m('option', { value: circle.mGroupName }, circle.mGroupName)
                  ),
                ]
              ),
            ]
          ),
        m('textarea.create-channel-form__description[rows=5][placeholder=Describe your channel]', {
          oninput: (e) => (body = e.target.value),
          value: body,
        }),
        m(
          'button.create-channel-form__submit',
          {
            onclick: async () => {
              const res = await rs.rsJsonApiRequest('/rsgxschannels/createChannelV2', {
                name: title,
                description: body,
                thumbnail: { mData: { base64: thumbnail } },
                ...(Number(identity) !== 0 && { authorId: identity }), // checks if some identity has to be assigned
                circleType: selectedGroupCode,
                ...(selectedGroupCode === util.EXTERNAL &&
                  selectedCircle && { circleId: selectedCircle.mGroupId }), // checks if the selectedGroup code is EXTERNAL
              });
              if (res.body.retval) {
                await util.updatedisplaychannels(res.body.channelId, undefined, false);
                if (vnode.attrs.onCreated) await vnode.attrs.onCreated();
                m.redraw();
              }
              res.body.retval === false
                ? widget.popupMessage([m('h3', 'Error'), m('hr'), m('p', res.body.errorMessage)])
                : widget.popupMessage([
                    m('h3', 'Success'),
                    m('hr'),
                    m('p', 'Channel created successfully'),
                  ]);
            },
          },
          'Create'
        ),
      ]),
  };
}

const AddPost = () => {
  let content = '';
  let ptitle = '';
  let pthumbnail;
  let thumbnailPreview = '';
  let thumbnailFileName = '';
  let attachmentLabel = 'Choose files';
  const attachmentItems = [];
  const pfiles = [];
  let uploadFiles = true;
  return {
    view: (vnode) =>
      m('.widget.create-channel-post-form', [
        m('.create-channel-post-form__heading', [
          m('h3', 'Create Channel Post'),
          m('p', 'Add a title, thumbnail, message, and optional attachments.'),
        ]),
        m('input.create-channel-post-form__title[type=text][placeholder=Post title]', {
          value: ptitle,
          oninput: (e) => (ptitle = e.target.value),
        }),
        m('.create-channel-post-form__thumbnail', [
          m('.channel-post-thumbnail-preview', [
            thumbnailPreview
              ? m('img', { src: thumbnailPreview, alt: 'Post thumbnail preview' })
              : m('.channel-post-thumbnail-preview__placeholder', [
                m('i.fas.fa-image'),
                m('span', 'Post thumbnail'),
                m('small', 'No image selected'),
              ]),
          ]),
          m('span.create-channel-post-form__thumbnail-label', 'Thumbnail'),
          m('input.create-channel-post-form__file-input[type=file][name=files][id=channel-post-thumbnail][accept=image/*]', {
          onchange: (e) => {
            const file = e.target.files[0];
            if (!file) return;
            thumbnailFileName = file.name;
            const reader = new FileReader();
            reader.onloadend = function () {
              thumbnailPreview = reader.result;
              pthumbnail = thumbnailPreview.substring(thumbnailPreview.indexOf(',') + 1);
              m.redraw();
            };
            reader.readAsDataURL(file);
          },
          }),
          m('label.create-channel-post-form__file-button[for=channel-post-thumbnail]', {
            title: thumbnailFileName || 'Choose a post thumbnail',
          }, [m('i.fas.fa-upload'), thumbnailPreview ? ' Change image' : ' Choose image']),
          m('small', 'Square images work best.'),
        ]),
        m('.create-channel-post-form__attachments', [
          m('label', 'Attachments'),
          m('input.create-channel-post-form__file-input[type=file][name=files][id=channel-post-files][multiple=multiple]', {
          disabled: !uploadFiles,
          // attachments option wrong hash, not working
          onchange: async (e) => {
            const input = e.target;
            const existingKeys = new Set(attachmentItems.map((file) => file.key));
            const newFiles = Array.from(input.files).filter((file) => {
              const key = `${file.name}:${file.size}:${file.lastModified}`;
              return !existingKeys.has(key);
            });
            input.value = '';
            if (newFiles.length === 0) return;

            attachmentItems.push(...newFiles.map((file) => ({
              key: `${file.name}:${file.size}:${file.lastModified}`,
              name: file.name,
              size: file.size,
              hash: '',
            })));
            attachmentLabel = `${attachmentItems.length} file${attachmentItems.length === 1 ? '' : 's'} selected`;
            uploadFiles = false;
            filesUploadHashes.PostFiles = [];
            m.redraw();
            for (let i = 0; i < newFiles.length; i++) {
              await parsefile(newFiles[i], 'multiple');
            }
            // console.log(filesUploadHashes.PostFiles, filesUploadHashes.PostFiles.length);

            if (filesUploadHashes.PostFiles.length === newFiles.length) {
              for (let i = 0; i < newFiles.length; i++) {
                pfiles.push({
                  name: newFiles[i].name,
                  size: newFiles[i].size,
                  hash: filesUploadHashes.PostFiles[i],
                });
              }
              uploadFiles = true;
              attachmentItems.forEach((item, index) => {
                item.hash = pfiles[index] && pfiles[index].hash;
              });
              m.redraw();
            }
          },
          }),
          m('label.create-channel-post-form__attachment-button[for=channel-post-files]', [
            m('i.fas.fa-paperclip'), ` ${attachmentLabel}`,
          ]),
          !uploadFiles && m('small', 'Preparing attachments...'),
          attachmentItems.length > 0 && m('.create-channel-post-form__attachment-list',
            attachmentItems.map((file, index) => m('.create-channel-post-form__attachment-item', [
              m('i.fas.fa-file'),
              m('.create-channel-post-form__attachment-info', [
                m('span', { title: file.name }, file.name),
                m('small', rs.formatBytes(file.size)),
              ]),
              m('button.create-channel-post-form__attachment-remove[type=button][title=Remove attachment]', {
                disabled: !uploadFiles,
                onclick: () => {
                  attachmentItems.splice(index, 1);
                  pfiles.splice(index, 1);
                  attachmentLabel = attachmentItems.length
                    ? `${attachmentItems.length} file${attachmentItems.length === 1 ? '' : 's'} selected`
                    : 'Choose files';
                },
              }, m('i.fas.fa-times')),
            ]))
          ),
        ]),
        m('textarea.create-channel-post-form__description[rows=7][placeholder=Write your post]', {
          oninput: (e) => (content = e.target.value),
          value: content,
        }),
        m(
          'button.create-channel-post-form__submit',
          {
            disabled: !uploadFiles || !ptitle.trim(),
            onclick: async () => {
              if (uploadFiles) {
                // console.log(vnode.attrs.chanId, ptitle, content, pfiles, pthumbnail);
                const res = await rs.rsJsonApiRequest('/rsgxschannels/createPostV2', {
                  channelId: vnode.attrs.chanId,
                  title: ptitle.trim(),
                  mBody: content,
                  files: pfiles, // does not work for now
                  thumbnail: { mData: { base64: pthumbnail } },
                });
                res.body.retval === false
                  ? widget.popupMessage([m('h3', 'Error'), m('hr'), m('p', res.body.errorMessage)])
                  : widget.popupMessage([
                      m('h3', 'Success'),
                      m('hr'),
                      m('p', 'Post added successfully'),
                    ]);
                util.updatedisplaychannels(vnode.attrs.chanId);
                m.redraw();
              }
            },
          },
          uploadFiles ? 'Create Post' : 'Preparing…'
        ),
      ]),
  };
};

//  When each channel last had its content pulled, so that stepping in and out
//  of a channel does not redownload it every time. Module level: the component
//  is rebuilt at every visit, a field of it would forget instantly.
const contentLoadedAt = {};
const CONTENT_CACHE_MS = 60000;

const ChannelView = () => {
  let cname = '';
  let cimage = '';
  let cauthor = '';
  let csubscribed = {};
  let mychannel = false;
  let cposts = 0;
  let plist = {};
  let createDate = {};
  let lastActivity = {};
  return {
    oninit: (v) => {
      if (Data.DisplayChannels[v.attrs.id]) {
        cname = Data.DisplayChannels[v.attrs.id].name;
        cimage = Data.DisplayChannels[v.attrs.id].image;
        //  Same as forum_view: userMap stores objects, username() is the only
        //  accessor that yields a string.
        if (Number(Data.DisplayChannels[v.attrs.id].author) === 0) {
          cauthor = 'No Contact Author';
        } else if (Data.DisplayChannels[v.attrs.id].author) {
          cauthor = rs.userList.username(Data.DisplayChannels[v.attrs.id].author);
        } else {
          cauthor = 'Unknown';
        }
        csubscribed = Data.DisplayChannels[v.attrs.id].isSubscribed;
        mychannel = Data.DisplayChannels[v.attrs.id].mychannel;
        cposts = Data.DisplayChannels[v.attrs.id].posts;
        createDate = Data.DisplayChannels[v.attrs.id].created;
        lastActivity = Data.DisplayChannels[v.attrs.id].activity;
      }
      if (Data.Posts[v.attrs.id]) {
        plist = Data.Posts[v.attrs.id];
      }
      //  Channel lists load metadata only, so the content is fetched here, on
      //  opening. oninit runs again on every visit though, and a 2000 item
      //  channel would redownload its whole content, images included, each time
      //  the user steps in and out. Skip it while the copy in memory is fresh,
      //  and let it age so posts published meanwhile still show up. The callers
      //  that publish or delete call updatedisplaychannels directly and are not
      //  affected by this guard.
      const lastLoad = contentLoadedAt[v.attrs.id] || 0;
      if (Object.keys(plist).length > 0 && Date.now() - lastLoad < CONTENT_CACHE_MS) return;
      contentLoadedAt[v.attrs.id] = Date.now();
      util.updatedisplaychannels(v.attrs.id).then(() => {
        plist = Data.Posts[v.attrs.id] || {};
        m.redraw();
      });
    },
    view: (v) => [
      m(
        'a[title=Back]',
        {
          onclick: () =>
            m.route.set('/channels/:tab', {
              tab: m.route.param().tab,
            }),
        },
        m('i.fas.fa-arrow-left')
      ),
      m('.widget__heading', [
        m('h3', cname),
        m(
          'button',
          {
            onclick: async () => {
              const res = await rs.rsJsonApiRequest('/rsgxschannels/subscribeToChannel', {
                channelId: v.attrs.id,
                subscribe: !csubscribed,
              });
              if (res.body.retval) {
                csubscribed = !csubscribed;
                Data.DisplayChannels[v.attrs.id].isSubscribed = csubscribed;
              }
            },
          },
          csubscribed ? 'Subscribed' : 'Subscribe'
        ),
      ]),
      m('.widget__body', [
        m('.media-item', [
          m('.media-item__details', [
            cimage && cimage.mData && cimage.mData.base64
              ? m('img', {
                src: `data:image/png;base64,${cimage.mData.base64}`,
                alt: `${cname} channel thumbnail`,
              })
              : m('.channel-detail-default-thumbnail[role=img][aria-label=Default channel thumbnail]',
                m('i.fas.fa-tv')
              ),
            m('.media-item__details-info', [
              m('div', [m('b', 'Posts: '), m('span', cposts)]),
              m('div', [
                m('b', 'Date created: '),
                m(
                  'span',
                  typeof createDate === 'object'
                    ? new Date(createDate.xint64 * 1000).toLocaleString()
                    : 'Unknown'
                ),
              ]),
              m('div', [m('b', 'Admin: '), m('span', cauthor)]),
              m('div', [
                m('b', 'Last activity: '),
                m(
                  'span',
                  typeof lastActivity === 'object'
                    ? new Date(lastActivity.xint64 * 1000).toLocaleString()
                    : 'Unknown'
                ),
              ]),
            ]),
          ]),
          m('.media-item__desc', [
            m('b', 'Description: '),
            m('span', Data.DisplayChannels[v.attrs.id].description || 'No Description'),
          ]),
        ]),
        m(
          '.posts',
          {
            style: 'display: ' + (csubscribed ? 'flex' : 'none'),
          },
          [
            m('.posts__heading.channel-posts-heading', [
              m('h3', 'Posts'),
              mychannel &&
                m(
                  'button.channel-posts-heading__create[type=button][title=Add Post][aria-label=Add Post]',
                  { onclick: () => widget.popupMessage(
                    m(AddPost, { chanId: v.attrs.id }),
                    'create-channel-post-modal'
                  ) },
                  [m('i.fas.fa-edit'), m('span', 'Add Post')]
                ),
            ]),
            m(
              '.posts-container',
              Object.keys(plist).map((key) => {
                const commentCount = channelPostCommentCount(key, plist[key].post);
                return [
                m(
                  '.posts-container-card',
                  {
                    style: {
                      display: plist[key].isSearched ? 'flex' : 'none', // for search
                      height: '240px',
                      minHeight: '0',
                      overflow: 'hidden',
                      flexDirection: 'column',
                      alignSelf: 'start',
                    },
                    onclick: () => {
                      m.route.set('/channels/:tab/:mGroupId/:mMsgId', {
                        tab: m.route.param().tab,
                        mGroupId: v.attrs.id,
                        mMsgId: key,
                      });
                    },
                  },
                  [
                    commentCount > 0 && m('.channel-post-comment-badge', {
                      title: `${commentCount} comment${commentCount === 1 ? '' : 's'}`,
                      'aria-label': `${commentCount} comment${commentCount === 1 ? '' : 's'}`,
                    }, [
                      m('i.fas.fa-comment'),
                      m('span', commentCount),
                    ]),
                    channelThumbnailSrc(plist[key].post)
                      ? [
                          m('img', {
                            src: channelThumbnailSrc(plist[key].post),
                            alt: plist[key].post.mMeta.mMsgName || 'Post thumbnail',
                            onerror: (e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            },
                          }),
                          m(ChannelFallbackThumbnail, { title: plist[key].post.mMeta.mMsgName, hidden: true }),
                        ]
                      : m(ChannelFallbackThumbnail, { title: plist[key].post.mMeta.mMsgName }),
                    m('p', plist[key].post.mMeta.mMsgName),
                  ]
                ),
                ];
              })
            ),
          ]
        ),
      ]),
    ],
  };
};

async function addvote(voteType, vchannelId, vpostId, vauthorId, vcommentId) {
  const res = await rs.rsJsonApiRequest('/rsgxschannels/voteForComment', {
    channelId: vchannelId,
    postId: vpostId,
    authorId: vauthorId,
    commentId: vcommentId,
    vote: voteType,
  });
  if (res.body.retval) {
    util.updatedisplaychannels(vchannelId);
    m.redraw();
  }
}

/* Modern threaded comment experience for channel posts. */
const ChannelComments = () => {
  let replyTo = null;
  let text = '';
  let identity = null;
  let submitting = false;
  let error = '';
  let showEmojiPicker = false;
  const expandedReplies = {};

  const metaOf = (comment) => (comment && comment.mMeta) || {};
  const idOf = (comment) => metaOf(comment).mMsgId || comment.msgId;
  const nameOf = (id) => rs.userList.username(id) || rs.userList.userMap[id] || `${String(id || 'Unknown').slice(0, 10)}…`;
  const dateOf = (value) => {
    const seconds = value && typeof value === 'object' ? value.xint64 : value;
    return Number(seconds) ? new Date(Number(seconds) * 1000).toLocaleString() : '';
  };

  function tree(threadId) {
    const nodes = {};
    const roots = [];
    Object.keys(Data.Comments[threadId] || {}).forEach((key) => {
      const entry = Data.Comments[threadId][key];
      const comment = entry.comment || entry;
      if (idOf(comment)) nodes[idOf(comment)] = { comment, children: [] };
    });
    Object.keys(nodes).forEach((key) => {
      const node = nodes[key];
      const parent = metaOf(node.comment).mParentId;
      if (parent && parent !== threadId && nodes[parent]) nodes[parent].children.push(node);
      else roots.push(node);
    });
    const chronological = (a, b) => Number(metaOf(a.comment).mPublishTs && (metaOf(a.comment).mPublishTs.xint64 || metaOf(a.comment).mPublishTs)) - Number(metaOf(b.comment).mPublishTs && (metaOf(b.comment).mPublishTs.xint64 || metaOf(b.comment).mPublishTs));
    roots.sort(chronological);
    Object.keys(nodes).forEach((key) => nodes[key].children.sort(chronological));
    return roots;
  }

  async function submit(vnode) {
    const comment = text.trim();
    if (!comment || !identity || submitting) return;
    submitting = true;
    error = '';
    try {
      const res = await rs.rsJsonApiRequest('/rsgxschannels/createCommentV2', {
        channelId: vnode.attrs.channelId,
        threadId: vnode.attrs.threadId,
        comment,
        authorId: identity,
        parentId: replyTo ? idOf(replyTo) : vnode.attrs.threadId,
      });
      if (!res || !res.body || res.body.retval === false) {
        error = (res && res.body && res.body.errorMessage) || 'Your comment could not be posted.';
        return;
      }
      text = '';
      replyTo = null;
      await util.updatedisplaychannels(vnode.attrs.channelId);
    } catch (submitError) {
      console.warn('Channel comment submission failed', submitError);
      error = 'Your comment could not be posted. Please try again.';
    } finally {
      submitting = false;
      m.redraw();
    }
  }

  function renderComment(node, vnode) {
    const comment = node.comment;
    const meta = metaOf(comment);
    const id = idOf(comment);
    const name = nameOf(meta.mAuthorId);
    const votes = (Data.Votes[meta.mThreadId] && Data.Votes[meta.mThreadId][id]) || { upvotes: 0, downvotes: 0 };
    const repliesExpanded = expandedReplies[id] === true;
    return m('.board-comment', { key: id }, [
      m('.board-comment-avatar', m(peopleUtil.IdentityAvatar, {
        identityId: meta.mAuthorId,
        name,
        size: '100%',
      })),
      m('.board-comment__content', [
        m('.board-comment__header', [
          m('.board-comment__meta', [m('b', name), dateOf(meta.mPublishTs) ? m('span', dateOf(meta.mPublishTs)) : null]),
          m('button.board-comment__menu[type=button][aria-label=Comment options]', m('i.fas.fa-ellipsis-v')),
        ]),
        m('p.board-comment__text', comment.mComment || comment.comment || ''),
        m('.board-comment__actions', [
          m('button[type=button]', { disabled: !vnode.attrs.voteIdentity, onclick: () => addvote(util.GXS_VOTE_UP, vnode.attrs.channelId, vnode.attrs.threadId, vnode.attrs.voteIdentity, id) }, [m('i.fas.fa-thumbs-up'), ` ${votes.upvotes || 0}`]),
          m('button[type=button]', { disabled: !vnode.attrs.voteIdentity, onclick: () => addvote(util.GXS_VOTE_DOWN, vnode.attrs.channelId, vnode.attrs.threadId, vnode.attrs.voteIdentity, id) }, m('i.fas.fa-thumbs-down')),
          m('button[type=button]', { onclick: () => { replyTo = comment; text = ''; error = ''; } }, 'Reply'),
        ]),
        node.children.length ? m('button.board-comment__replies-toggle[type=button]', { 'aria-expanded': repliesExpanded, onclick: () => { expandedReplies[id] = !repliesExpanded; } }, [`${node.children.length} ${node.children.length === 1 ? 'reply' : 'replies'} `, m('i.fas', { class: repliesExpanded ? 'fa-chevron-up' : 'fa-chevron-down' })]) : null,
        node.children.length && repliesExpanded ? m('.board-comment__replies', node.children.map((child) => renderComment(child, vnode))) : null,
      ]),
    ]);
  }

  return {
    view: (vnode) => {
      const identities = (vnode.attrs.identities || []).filter((id) => Number(id) !== 0);
      if (!identity && identities.length) identity = identities[0];
      const comments = tree(vnode.attrs.threadId);
      return m('.board-comments.channel-comments', [
        m('.board-comments__heading', [
          m('h3', `${Object.keys(Data.Comments[vnode.attrs.threadId] || {}).length} Comment${Object.keys(Data.Comments[vnode.attrs.threadId] || {}).length === 1 ? '' : 's'}`),
          m('span', [m('i.fas.fa-sort-amount-down'), ' Oldest first']),
          m('.board-comments__voter', [
            m('label[for=channel-comment-voter]', 'Voter identity'),
            m('select#channel-comment-voter', {
              value: vnode.attrs.voteIdentity || '',
              disabled: identities.length === 0,
              onchange: (e) => vnode.attrs.onVoteIdentity(e.target.value),
            }, identities.length
              ? identities.map((id) => m('option', { value: id }, nameOf(id)))
              : m('option', { value: '' }, vnode.attrs.identitiesLoading ? 'Loading identities…' : 'No identity available')),
          ]),
        ]),
        m('.board-comment-composer', [
          m('.board-comment-avatar', m(peopleUtil.IdentityAvatar, {
            identityId: identity,
            name: nameOf(identity),
            size: '100%',
          })),
          m('.board-comment-composer__body', [
            replyTo ? m('.board-comment-composer__replying', ['Replying to ', m('b', nameOf(metaOf(replyTo).mAuthorId)), m('button[type=button][aria-label=Cancel reply]', { onclick: () => { replyTo = null; text = ''; } }, m('i.fas.fa-times'))]) : null,
            identities.length ? m('select.board-comment-composer__identity', { value: identity, onchange: (e) => { identity = e.target.value; } }, identities.map((id) => m('option', { value: id }, nameOf(id)))) : null,
            m('textarea.board-comment-composer__input[rows=1][placeholder=Add a comment…]', { value: text, disabled: !identity || submitting, oninput: (e) => { text = e.target.value; }, onkeydown: (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submit(vnode); } }),
            !identity ? m('p.board-comment-composer__hint', vnode.attrs.identitiesLoading ? 'Loading identities…' : 'Create or select an identity to post a comment.') : null,
            error ? m('p.board-comment-composer__error', error) : null,
            m('.board-comment-composer__actions', [
              m('.board-comment-composer__emoji', { style: { position: 'relative', marginRight: 'auto' } }, [
                m('button[type=button][title=Insert emoji][aria-label=Insert emoji]', { style: { width: '32px', height: '32px', padding: '0', borderRadius: '50%', border: '0', boxShadow: 'none', background: showEmojiPicker ? '#e0f2fe' : 'transparent', color: '#475569', fontSize: '1.15rem' }, onclick: () => { showEmojiPicker = !showEmojiPicker; } }, m('i.fas.fa-smile')),
                showEmojiPicker ? m('.board-comment-emoji-popover', { style: { position: 'absolute', zIndex: '20', top: '38px', left: '0', width: '250px', maxHeight: '180px', overflowY: 'auto', padding: '.5rem', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '.2rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 8px 20px rgba(0,0,0,.16)' } }, chatEmoji.EMOJI_DATA.Smileys.slice(0, 48).map((emoji) => m('button[type=button]', { style: { width: '28px', height: '28px', padding: '0', border: '0', boxShadow: 'none', background: 'transparent', fontSize: '1.1rem' }, onclick: () => { text += emoji; showEmojiPicker = false; } }, emoji))) : null,
              ]),
              text || replyTo ? m('button.board-comment-composer__cancel[type=button]', { onclick: () => { text = ''; replyTo = null; error = ''; } }, 'Cancel') : null,
              m('button.board-comment-composer__submit[type=button]', { disabled: !text.trim() || !identity || submitting, onclick: () => submit(vnode) }, submitting ? 'Posting…' : 'Comment'),
            ]),
          ]),
        ]),
        comments.length ? m('.board-comments__list', comments.map((node) => renderComment(node, vnode))) : m('.board-comments__empty', [m('i.fas.fa-comment'), m('p', 'No comments yet. Start the conversation.')]),
      ]);
    },
  };
};

const PostView = () => {
  let post = {};
  const filesInfo = {};
  let voteIdentity;
  let ownId;
  let identitiesLoading = true;
  let messageExpanded = false;
  return {
    oninit: async (v) => {
      if (Data.Posts[v.attrs.channelId] && Data.Posts[v.attrs.channelId][v.attrs.msgId]) {
        post = Data.Posts[v.attrs.channelId][v.attrs.msgId].post;
      }
      if (post) {
        post.mFiles.map(async (file) => {
          const res = await rs.rsJsonApiRequest('/rsfiles/alreadyHaveFile', {
            // checks if the file is already there with the user
            hash: file.mHash,
          });
          filesInfo[file.mHash] = res.body;
        });
      }
      await peopleUtil.ownIds((data) => {
        ownId = data;
        for (let i = 0; i < ownId.length; i++) {
          if (Number(ownId[i]) === 0) {
            ownId.splice(i, 1); // workaround for id '0'
          }
        }
        voteIdentity = ownId[0];
        identitiesLoading = false;
      });
      fileDown.Downloads.loadStatus(); // for retrieving downloading files.
    },
    view: (v) => {
      const message = post.mMsg || '';
      const messageText = String(message).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const hasEmbeddedImage = /<img\b|data:image\//i.test(String(message));
      const hasLongMessage = messageText.length > 280 || hasEmbeddedImage;
      return [
      m(
        'a[title=Back]',
        {
          onclick: () =>
            m.route.set('/channels/:tab/:mGroupId', {
              tab: m.route.param().tab,
              mGroupId: m.route.param().mGroupId,
            }),
        },
        m('i.fas.fa-arrow-left')
      ),
      m('.widget__heading', m('h3', post.mMeta.mMsgName)),
      m('.widget__body', [
        message ? m('.post-description', [
          m('.post-description__text', {
            style: {
              maxHeight: messageExpanded ? 'none' : '4.5em',
              overflow: 'hidden',
              lineHeight: '1.5',
            },
          }, m.trust(message)),
          hasLongMessage ? m('button.post-description__toggle[type=button]', {
            style: { marginTop: '.35rem', padding: '0', border: '0', boxShadow: 'none', background: 'transparent', color: '#0f172a', fontSize: '.85rem', fontWeight: '700' },
            onclick: () => { messageExpanded = !messageExpanded; },
          }, messageExpanded ? 'Show less' : '…more') : null,
        ]) : null,
        m('.file-section', [
          m('h3', 'Files(' + post.mAttachmentCount + ')'),
          m(
            util.FilesTable,
            m(
              'tbody',
              post.mFiles.map((file) =>
                m('tr', [
                  m('td.channel-file__name[data-label=File name]', file.mName),
                  m('td.channel-file__size[data-label=Size]', rs.formatBytes(file.mSize.xint64)),
                  m('td.channel-file__action[data-label=Download]', [
                    m(
                      'button',
                      {
                        style: { fontSize: '0.9em' },
                        onclick: async () =>
                          widget.popupMessage([
                            m('p', 'Start Download?'),
                            m(
                              'button',
                              {
                                onclick: async () => {
                                  if (filesInfo[file.mHash] && !filesInfo[file.mHash].retval) {
                                    const res = await rs.rsJsonApiRequest('/rsFiles/FileRequest', {
                                      fileName: file.mName,
                                      hash: file.mHash,
                                      flags: util.RS_FILE_REQ_ANONYMOUS_ROUTING,
                                      size: {
                                        xstr64: file.mSize.xstr64,
                                      },
                                    });
                                    res.body.retval === false
                                      ? widget.popupMessage([
                                          m('h3', 'Error'),
                                          m('hr'),
                                          m('p', res.body.errorMessage),
                                        ])
                                      : widget.popupMessage([
                                          m('h3', 'Success'),
                                          m('hr'),
                                          m('p', 'Download Started'),
                                        ]);
                                    m.redraw();
                                  }
                                },
                              },
                              'Start Download'
                            ),
                          ]),
                      },
                      filesInfo[file.mHash]
                        ? filesInfo[file.mHash].retval
                          ? 'Open File'
                          : ['Download ', m('i.fas.fa-download')]
                        : 'Please Wait...'
                    ),
                    fileDown.list[file.mHash] && m(fileUtil.File, {
                      info: fileDown.list[file.mHash],
                      direction: 'down',
                      transferred: fileDown.list[file.mHash].transfered.xint64,
                      parts: [],
                    }),
                  ]),
                ])
              )
            )
          ),
        ]),
        m(ChannelComments, {
          channelId: v.attrs.channelId,
          threadId: v.attrs.msgId,
          identities: ownId,
          voteIdentity,
          identitiesLoading,
          onVoteIdentity: (id) => { voteIdentity = id; },
        }),
      ]),
      ];
    },
  };
};

module.exports = {
  ChannelView,
  PostView,
  createchannel,
};
 
}); 
require.register("channels/my_channels", function(exports, require, module) { 
const m = require('mithril');
const util = require('channels/channels_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'My Channels')),
      m('.widget__body', [
        m(
          util.ChannelTable,
          m('tbody', [
            v.attrs.list.map((channel) =>
              m(util.ChannelSummary, {
                details: channel,
                category: 'MyChannels',
              })
            ),
            v.attrs.list.map((channel) =>
              m(util.DisplayChannelsFromList, {
                id: channel.mGroupId,
                category: 'MyChannels',
              })
            ),
          ])
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("channels/other_channels", function(exports, require, module) { 
const m = require('mithril');
const util = require('channels/channels_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Other Channels')),
      m('.widget__body', [
        m(
          util.ChannelTable,
          m('tbody', [
            v.attrs.list.map((channel) =>
              m(util.ChannelSummary, {
                details: channel,
                category: 'Other',
              })
            ),
            v.attrs.list.map((channel) =>
              m(util.DisplayChannelsFromList, {
                id: channel.mGroupId,
                category: 'Other',
              })
            ),
          ])
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("channels/popular_channels", function(exports, require, module) { 
const m = require('mithril');
const util = require('channels/channels_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Popular Channels')),
      m('.widget__body', [
        m(
          util.ChannelTable,
          m('tbody', [
            v.attrs.list.map((channel) =>
              m(util.ChannelSummary, {
                details: channel,
                category: 'Popular',
              })
            ),
            v.attrs.list.map((channel) =>
              m(util.DisplayChannelsFromList, {
                id: channel.mGroupId,
                category: 'Popular',
              })
            ),
          ])
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("channels/sha1", function(exports, require, module) { 
/*
 * [js-sha1]{@link https://github.com/emn178/js-sha1}
 *
 * @version 0.6.0
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2014-2017
 * @license MIT
 */
/* jslint bitwise: true */
(function() {
    'use strict';

    let root = typeof window === 'object' ? window : {};
    const NODE_JS = !root.JS_SHA1_NO_NODE_JS && typeof process === 'object';
    if (NODE_JS) {
      root = global;
    }
    const COMMON_JS = !root.JS_SHA1_NO_COMMON_JS && typeof module === 'object' && module.exports;
    // const AMD = typeof define === 'function' && define.amd;
    const HEX_CHARS = '0123456789abcdef'.split('');
    const EXTRA = [-2147483648, 8388608, 32768, 128];
    const SHIFT = [24, 16, 8, 0];
    const OUTPUT_TYPES = ['hex', 'array', 'digest', 'arrayBuffer'];

    const blocks = [];
    function Sha1(sharedMemory) {
      if (sharedMemory) {
        blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] =
        blocks[4] = blocks[5] = blocks[6] = blocks[7] =
        blocks[8] = blocks[9] = blocks[10] = blocks[11] =
        blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
        this.blocks = blocks;
      } else {
        this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      }

      this.h0 = 0x67452301;
      this.h1 = 0xEFCDAB89;
      this.h2 = 0x98BADCFE;
      this.h3 = 0x10325476;
      this.h4 = 0xC3D2E1F0;

      this.block = this.start = this.bytes = this.hBytes = 0;
      this.finalized = this.hashed = false;
      this.first = true;
    }
    const createOutputMethod = function (outputType) {
      return function (message) {
        return new Sha1(true).update(message)[outputType]();
      };
    };
    const nodeWrap = function (method) {
      const crypto = eval('require(\'crypto\')');
      const Buffer = eval('require(\'buffer\').Buffer');
      const nodeMethod = function (message) {
        if (typeof message === 'string') {
          return crypto.createHash('sha1').update(message, 'utf8').digest('hex');
        } else if (message.constructor === ArrayBuffer) {
          message = new Uint8Array(message);
        } else if (message.length === undefined) {
          return method(message);
        }
        return crypto.createHash('sha1').update(new Buffer(message)).digest('hex');
      };
      return nodeMethod;
    };
    const createMethod = function () {
      let method = createOutputMethod('hex');
      if (NODE_JS) {
        method = nodeWrap(method);
      }
      method.create = function () {
        return new Sha1();
      };
      method.update = function (message) {
        return method.create().update(message);
      };
      for (let i = 0; i < OUTPUT_TYPES.length; ++i) {
        const type = OUTPUT_TYPES[i];
        method[type] = createOutputMethod(type);
      }
      return method;
    };


    Sha1.prototype.update = function (message) {
      if (this.finalized) {
        return;
      }
      const notString = typeof(message) !== 'string';
      if (notString && message.constructor === root.ArrayBuffer) {
        message = new Uint8Array(message);
      }
      let code, index = 0, i;
      const length = message.length || 0, blocks = this.blocks;

      while (index < length) {
        if (this.hashed) {
          this.hashed = false;
          blocks[0] = this.block;
          blocks[16] = blocks[1] = blocks[2] = blocks[3] =
          blocks[4] = blocks[5] = blocks[6] = blocks[7] =
          blocks[8] = blocks[9] = blocks[10] = blocks[11] =
          blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
        }

        if(notString) {
          for (i = this.start; index < length && i < 64; ++index) {
            blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
          }
        } else {
          for (i = this.start; index < length && i < 64; ++index) {
            code = message.charCodeAt(index);
            if (code < 0x80) {
              blocks[i >> 2] |= code << SHIFT[i++ & 3];
            } else if (code < 0x800) {
              blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
            } else if (code < 0xd800 || code >= 0xe000) {
              blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
            } else {
              code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
              blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
            }
          }
        }

        this.lastByteIndex = i;
        this.bytes += i - this.start;
        if (i >= 64) {
          this.block = blocks[16];
          this.start = i - 64;
          this.hash();
          this.hashed = true;
        } else {
          this.start = i;
        }
      }
      if (this.bytes > 4294967295) {
        this.hBytes += this.bytes / 4294967296 << 0;
        this.bytes = this.bytes % 4294967296;
      }
      return this;
    };

    Sha1.prototype.finalize = function () {
      if (this.finalized) {
        return;
      }
      this.finalized = true;
      const blocks = this.blocks, i = this.lastByteIndex;
      blocks[16] = this.block;
      blocks[i >> 2] |= EXTRA[i & 3];
      this.block = blocks[16];
      if (i >= 56) {
        if (!this.hashed) {
          this.hash();
        }
        blocks[0] = this.block;
        blocks[16] = blocks[1] = blocks[2] = blocks[3] =
        blocks[4] = blocks[5] = blocks[6] = blocks[7] =
        blocks[8] = blocks[9] = blocks[10] = blocks[11] =
        blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      }
      blocks[14] = this.hBytes << 3 | this.bytes >>> 29;
      blocks[15] = this.bytes << 3;
      this.hash();
    };

    Sha1.prototype.hash = function () {
      let a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4;
      let f, j, t;
      const blocks = this.blocks;

      for(j = 16; j < 80; ++j) {
        t = blocks[j - 3] ^ blocks[j - 8] ^ blocks[j - 14] ^ blocks[j - 16];
        blocks[j] =  (t << 1) | (t >>> 31);
      }

      for(j = 0; j < 20; j += 5) {
        f = (b & c) | ((~b) & d);
        t = (a << 5) | (a >>> 27);
        e = t + f + e + 1518500249 + blocks[j] << 0;
        b = (b << 30) | (b >>> 2);

        f = (a & b) | ((~a) & c);
        t = (e << 5) | (e >>> 27);
        d = t + f + d + 1518500249 + blocks[j + 1] << 0;
        a = (a << 30) | (a >>> 2);

        f = (e & a) | ((~e) & b);
        t = (d << 5) | (d >>> 27);
        c = t + f + c + 1518500249 + blocks[j + 2] << 0;
        e = (e << 30) | (e >>> 2);

        f = (d & e) | ((~d) & a);
        t = (c << 5) | (c >>> 27);
        b = t + f + b + 1518500249 + blocks[j + 3] << 0;
        d = (d << 30) | (d >>> 2);

        f = (c & d) | ((~c) & e);
        t = (b << 5) | (b >>> 27);
        a = t + f + a + 1518500249 + blocks[j + 4] << 0;
        c = (c << 30) | (c >>> 2);
      }

      for(; j < 40; j += 5) {
        f = b ^ c ^ d;
        t = (a << 5) | (a >>> 27);
        e = t + f + e + 1859775393 + blocks[j] << 0;
        b = (b << 30) | (b >>> 2);

        f = a ^ b ^ c;
        t = (e << 5) | (e >>> 27);
        d = t + f + d + 1859775393 + blocks[j + 1] << 0;
        a = (a << 30) | (a >>> 2);

        f = e ^ a ^ b;
        t = (d << 5) | (d >>> 27);
        c = t + f + c + 1859775393 + blocks[j + 2] << 0;
        e = (e << 30) | (e >>> 2);

        f = d ^ e ^ a;
        t = (c << 5) | (c >>> 27);
        b = t + f + b + 1859775393 + blocks[j + 3] << 0;
        d = (d << 30) | (d >>> 2);

        f = c ^ d ^ e;
        t = (b << 5) | (b >>> 27);
        a = t + f + a + 1859775393 + blocks[j + 4] << 0;
        c = (c << 30) | (c >>> 2);
      }

      for(; j < 60; j += 5) {
        f = (b & c) | (b & d) | (c & d);
        t = (a << 5) | (a >>> 27);
        e = t + f + e - 1894007588 + blocks[j] << 0;
        b = (b << 30) | (b >>> 2);

        f = (a & b) | (a & c) | (b & c);
        t = (e << 5) | (e >>> 27);
        d = t + f + d - 1894007588 + blocks[j + 1] << 0;
        a = (a << 30) | (a >>> 2);

        f = (e & a) | (e & b) | (a & b);
        t = (d << 5) | (d >>> 27);
        c = t + f + c - 1894007588 + blocks[j + 2] << 0;
        e = (e << 30) | (e >>> 2);

        f = (d & e) | (d & a) | (e & a);
        t = (c << 5) | (c >>> 27);
        b = t + f + b - 1894007588 + blocks[j + 3] << 0;
        d = (d << 30) | (d >>> 2);

        f = (c & d) | (c & e) | (d & e);
        t = (b << 5) | (b >>> 27);
        a = t + f + a - 1894007588 + blocks[j + 4] << 0;
        c = (c << 30) | (c >>> 2);
      }

      for(; j < 80; j += 5) {
        f = b ^ c ^ d;
        t = (a << 5) | (a >>> 27);
        e = t + f + e - 899497514 + blocks[j] << 0;
        b = (b << 30) | (b >>> 2);

        f = a ^ b ^ c;
        t = (e << 5) | (e >>> 27);
        d = t + f + d - 899497514 + blocks[j + 1] << 0;
        a = (a << 30) | (a >>> 2);

        f = e ^ a ^ b;
        t = (d << 5) | (d >>> 27);
        c = t + f + c - 899497514 + blocks[j + 2] << 0;
        e = (e << 30) | (e >>> 2);

        f = d ^ e ^ a;
        t = (c << 5) | (c >>> 27);
        b = t + f + b - 899497514 + blocks[j + 3] << 0;
        d = (d << 30) | (d >>> 2);

        f = c ^ d ^ e;
        t = (b << 5) | (b >>> 27);
        a = t + f + a - 899497514 + blocks[j + 4] << 0;
        c = (c << 30) | (c >>> 2);
      }

      this.h0 = this.h0 + a << 0;
      this.h1 = this.h1 + b << 0;
      this.h2 = this.h2 + c << 0;
      this.h3 = this.h3 + d << 0;
      this.h4 = this.h4 + e << 0;
    };

    Sha1.prototype.hex = function () {
      this.finalize();

      const h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4;

      return HEX_CHARS[(h0 >> 28) & 0x0F] + HEX_CHARS[(h0 >> 24) & 0x0F] +
             HEX_CHARS[(h0 >> 20) & 0x0F] + HEX_CHARS[(h0 >> 16) & 0x0F] +
             HEX_CHARS[(h0 >> 12) & 0x0F] + HEX_CHARS[(h0 >> 8) & 0x0F] +
             HEX_CHARS[(h0 >> 4) & 0x0F] + HEX_CHARS[h0 & 0x0F] +
             HEX_CHARS[(h1 >> 28) & 0x0F] + HEX_CHARS[(h1 >> 24) & 0x0F] +
             HEX_CHARS[(h1 >> 20) & 0x0F] + HEX_CHARS[(h1 >> 16) & 0x0F] +
             HEX_CHARS[(h1 >> 12) & 0x0F] + HEX_CHARS[(h1 >> 8) & 0x0F] +
             HEX_CHARS[(h1 >> 4) & 0x0F] + HEX_CHARS[h1 & 0x0F] +
             HEX_CHARS[(h2 >> 28) & 0x0F] + HEX_CHARS[(h2 >> 24) & 0x0F] +
             HEX_CHARS[(h2 >> 20) & 0x0F] + HEX_CHARS[(h2 >> 16) & 0x0F] +
             HEX_CHARS[(h2 >> 12) & 0x0F] + HEX_CHARS[(h2 >> 8) & 0x0F] +
             HEX_CHARS[(h2 >> 4) & 0x0F] + HEX_CHARS[h2 & 0x0F] +
             HEX_CHARS[(h3 >> 28) & 0x0F] + HEX_CHARS[(h3 >> 24) & 0x0F] +
             HEX_CHARS[(h3 >> 20) & 0x0F] + HEX_CHARS[(h3 >> 16) & 0x0F] +
             HEX_CHARS[(h3 >> 12) & 0x0F] + HEX_CHARS[(h3 >> 8) & 0x0F] +
             HEX_CHARS[(h3 >> 4) & 0x0F] + HEX_CHARS[h3 & 0x0F] +
             HEX_CHARS[(h4 >> 28) & 0x0F] + HEX_CHARS[(h4 >> 24) & 0x0F] +
             HEX_CHARS[(h4 >> 20) & 0x0F] + HEX_CHARS[(h4 >> 16) & 0x0F] +
             HEX_CHARS[(h4 >> 12) & 0x0F] + HEX_CHARS[(h4 >> 8) & 0x0F] +
             HEX_CHARS[(h4 >> 4) & 0x0F] + HEX_CHARS[h4 & 0x0F];
    };

    Sha1.prototype.toString = Sha1.prototype.hex;

    Sha1.prototype.digest = function () {
      this.finalize();

      const h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4;

      return [
        (h0 >> 24) & 0xFF, (h0 >> 16) & 0xFF, (h0 >> 8) & 0xFF, h0 & 0xFF,
        (h1 >> 24) & 0xFF, (h1 >> 16) & 0xFF, (h1 >> 8) & 0xFF, h1 & 0xFF,
        (h2 >> 24) & 0xFF, (h2 >> 16) & 0xFF, (h2 >> 8) & 0xFF, h2 & 0xFF,
        (h3 >> 24) & 0xFF, (h3 >> 16) & 0xFF, (h3 >> 8) & 0xFF, h3 & 0xFF,
        (h4 >> 24) & 0xFF, (h4 >> 16) & 0xFF, (h4 >> 8) & 0xFF, h4 & 0xFF
      ];
    };

    Sha1.prototype.array = Sha1.prototype.digest;

    Sha1.prototype.arrayBuffer = function () {
      this.finalize();

      const buffer = new ArrayBuffer(20);
      const dataView = new DataView(buffer);
      dataView.setUint32(0, this.h0);
      dataView.setUint32(4, this.h1);
      dataView.setUint32(8, this.h2);
      dataView.setUint32(12, this.h3);
      dataView.setUint32(16, this.h4);
      return buffer;
    };

    const exports = createMethod();

    if (COMMON_JS) {
      module.exports = exports;
    } else {
      root.sha1 = exports;
      // if (AMD) {
      //   define(function () {
      //     return exports;
      //   });
      // }
    }
  })();
 
}); 
require.register("channels/subscribed_channels", function(exports, require, module) { 
const m = require('mithril');
const util = require('channels/channels_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Subscribed Channels')),
      m('.widget__body', [
        m(
          util.ChannelTable,
          m('tbody', [
            v.attrs.list.map((channel) =>
              m(util.ChannelSummary, {
                details: channel,
                category: 'Subscribed',
              })
            ),
            v.attrs.list.map((channel) =>
              m(util.DisplayChannelsFromList, {
                id: channel.mGroupId,
                category: 'Subscribed',
              })
            ),
          ])
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("chat/chat", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const peopleUtil = require('people/people_util');
const people = require('people/people');
const chatState = require('chat/chat_state');
const chatEmoji = require('chat/chat_emoji');
const HistoryBrowserModal = require('people/people_history');

const {
  sortLobbies,
  getStatusColor,
  getStatusTooltip,
  getSafeAvatar,
  ChatRoomsModel,
  ChatLobbyModel,
  ChatHubState,
} = chatState;

chatEmoji.setDependencies({ ChatHubState });

// Mirroring C++ RsHtml::makeEmbeddedImage for resizing chat images to fit RetroShare max packet limit (~30KB)
function formatChatImage(file, callback) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const img = new Image();
    img.onload = () => {
      // Bounding box for chat images: 420x320 max
      const maxWidth = 420;
      const maxHeight = 320;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Dynamically step down JPEG quality until base64 string is under 28,000 characters (28KB)
      let quality = 0.70;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > 28000 && quality > 0.15) {
        quality -= 0.10;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      if (dataUrl.length <= 32000) {
        callback(`<img src="${dataUrl}" />`);
      } else {
        alert('Image file is too large to send over RetroShare chat packet size limit.');
        callback(null);
      }
    };
    img.onerror = () => {
      callback(null);
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function loadOwnChatProfile() {
  rs.rsJsonApiRequest('/rsConfig/getConfigNetStatus', {}, (data) => {
    if (data && data.status) {
      ChatHubState.ownProfile.name = data.status.ownName || 'Unknown';
      m.redraw();
    }
  });
}

function loadFriendsForInvite() {
  ChatHubState.friendsList = [];
  rs.rsJsonApiRequest('/rsPeers/getFriendList', {}, (data) => {
    if (data && data.sslIds) {
      data.sslIds.forEach((sslId) => {
        rs.rsJsonApiRequest('/rsPeers/getPeerDetails', { sslId }, (detData) => {
          if (detData && detData.det) {
            rs.rsJsonApiRequest('/rsPeers/isOnline', { sslId }, (onlineData) => {
              ChatHubState.friendsList.push({
                id: sslId,
                name: detData.det.name,
                online: onlineData ? onlineData.retval : false
              });
              ChatHubState.friendsList.sort((a, b) => {
                if (a.online !== b.online) return a.online ? -1 : 1;
                return a.name.localeCompare(b.name);
              });
              m.redraw();
            });
          }
        });
      });
    }
  });
}

function scrollChatToBottom() {
  setTimeout(() => {
    const element = document.querySelector('.chat-hub-messages');
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, 50);
}

function renderUserTooltip(gxsId, name) {
  const details = ChatHubState.gxsDetails[gxsId];
  if (!details) return null;

  const avatar = getSafeAvatar(details);
  const firstLetter = (name || '?').slice(0, 1).toUpperCase();
  const votes = details.mReputation
    ? (details.mReputation.mFriendsPositiveVotes - details.mReputation.mFriendsNegativeVotes)
    : 0;

  const rect = ChatHubState.hoveredUser ? ChatHubState.hoveredUser.rect : null;
  const tooltipWidth = 280;
  const tooltipGap = 10;
  let left = rect ? rect.left - tooltipWidth - tooltipGap : window.innerWidth - tooltipWidth - tooltipGap;
  if (left < tooltipGap && rect) left = rect.right + tooltipGap;
  let top = rect ? rect.top : 100;
  if (top + 160 > window.innerHeight) top = window.innerHeight - 170;
  if (top < 10) top = 10;

  return m('.user-tooltip', {
    style: {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 10000,
    }
  }, [
    m('.tooltip-avatar', m(peopleUtil.UserAvatar, { avatar, firstLetter, identityId: gxsId, size: 56, isSquare: true })),
    m('.tooltip-details', [
      m('.tooltip-row', [m('span.tooltip-label', 'Identity name: '), m('span.tooltip-value', name)]),
      m('.tooltip-row', [m('span.tooltip-label', 'Identity Id: '), m('span.tooltip-value.tooltip-id', gxsId)]),
      details.mPgpId && details.mPgpId !== '0000000000000000' && m('.tooltip-row', [
        m('span.tooltip-label', 'Node: '),
        m('span.tooltip-value', `${rs.userList.username(details.mPgpId) || name} [${details.mPgpId}]`)
      ]),
      m('.tooltip-row', [
        m('span.tooltip-label', 'Votes: '),
        m('span.tooltip-value', {
          style: {
            color: votes >= 0 ? '#008000' : '#cc0000',
            fontWeight: 'bold'
          }
        }, (votes >= 0 ? '+' : '') + votes)
      ])
    ])
  ]);
}

function pollHashStatus(localpath) {
  rs.rsJsonApiRequest('/rsFiles/ExtraFileStatus', { localpath }, (data) => {
    if (data && data.retval && data.info && data.info.hash && data.info.hash !== '0000000000000000000000000000000000000000') {
      const info = data.info;
      const sizeNum = info.size.xint64 || parseInt(info.size.xstr64) || info.size;
      const fileLink = `<a href="retroshare://file?name=${encodeURIComponent(info.name)}&size=${sizeNum}&hash=${info.hash}">${info.name}</a> (${rs.formatBytes(sizeNum)})`;

      const textarea = document.querySelector('.chat-hub-textarea');
      if (textarea) {
        const val = textarea.value;
        textarea.value = val ? val + '\n' + fileLink : fileLink;
      }

      ChatHubState.showAttachModal = false;
      ChatHubState.isHashing = false;
      ChatHubState.attachPath = '';
      m.redraw();
    } else {
      if (ChatHubState.isHashing) {
        setTimeout(() => pollHashStatus(localpath), 1000);
      }
    }
  });
}

// ************************* views ****************************

// ************************* Chat Hub Sub-Components ****************************

const ChatRoomHeader = () => {
  return {
    view: (vnode) => {
      const room = vnode.attrs.room;
      const lobbyHexId = rs.idToHex(room.lobby_id);
      const isDistant = room.chatType === 2;
      return m('.chat-hub-header-bar', [
        m('.chat-header-info', [
          m('.chat-header-name-container', { style: 'display: flex; align-items: center; gap: 0.5rem;' }, [
            m('.chat-header-name', room.lobby_name || '<unnamed>'),
            isDistant && m('i.fas.fa-circle', {
              style: {
                color: getStatusColor(ChatLobbyModel.distantChatStatus ? ChatLobbyModel.distantChatStatus.status : 0),
                fontSize: '0.85rem',
                transition: 'color 0.3s ease',
              },
              title: getStatusTooltip(ChatLobbyModel.distantChatStatus ? ChatLobbyModel.distantChatStatus.status : 0),
            })
          ]),
          m('.chat-header-topic', room.lobby_topic || 'No topic'),
        ]),
        m('.chat-header-actions', [
          isDistant
            ? [
                m(
                  'button.blue',
                  {
                    title: 'View distant chat history',
                    style: 'margin-right: 0.75rem;',
                    onclick: () => {
                      ChatHubState.showHistoryModal = true;
                    }
                  },
                  [m('i.fas.fa-history'), ' History']
                ),
                m(
                  'button.red',
                  {
                    title: 'Leave Distant Chat',
                    onclick: () => {
                      if (confirm('Are you sure you want to leave this distant chat conversation?')) {
                        rs.rsJsonApiRequest(
                          '/rsChats/closeDistantChatConnexion',
                          {
                            pid: lobbyHexId,
                          },
                          (data, success) => {
                            if (success) {
                              ChatLobbyModel.stopStatusPolling();
                              ChatHubState.selectedRoom = null;
                              ChatHubState.selectedRoomId = null;
                              ChatHubState.selectedRoomType = null;
                              m.route.set('/chat');
                            }
                          }
                        );
                      }
                    },
                  },
                  [m('i.fas.fa-sign-out-alt'), ' Leave Chat']
                )
              ]
            : [
                m(
                  'button',
                  {
                    title: 'Invite friends to this room',
                    style: 'margin-right: 0.75rem;',
                    onclick: () => {
                      ChatHubState.showInviteModal = true;
                      loadFriendsForInvite();
                    }
                  },
                  [m('i.fas.fa-user-plus'), ' Invite']
                ),
                m(
                  'button.blue',
                  {
                    title: 'View chat room history',
                    style: 'margin-right: 0.75rem;',
                    onclick: () => {
                      ChatHubState.showHistoryModal = true;
                    }
                  },
                  [m('i.fas.fa-history'), ' History']
                ),
                m(
                  'button.red',
                  {
                    title: 'Leave Room',
                    onclick: () => {
                      ChatLobbyModel.unsubscribeChatLobby(lobbyHexId, () => {
                        ChatHubState.selectedRoom = null;
                        ChatHubState.selectedRoomId = null;
                        ChatHubState.selectedRoomType = null;
                        m.route.set('/chat');
                      });
                    },
                  },
                  [m('i.fas.fa-sign-out-alt'), ' Leave']
                )
              ],
        ]),
      ]);
    },
  };
};

const ChatConversationView = () => {
  function onDocClick(e) {
    if (ChatHubState.showEmojiPicker && !e.target.closest('.emoji-picker-wrapper')) {
      ChatHubState.showEmojiPicker = false;
      m.redraw();
    }
  }
  return {
    oninit: () => {
      scrollChatToBottom();
    },
    oncreate: () => {
      document.addEventListener('click', onDocClick, true);
    },
    onremove: () => {
      document.removeEventListener('click', onDocClick, true);
    },
    view: () => {
      const chatType = ChatLobbyModel.currentLobby && ChatLobbyModel.currentLobby.chatType;
      const isRoom = chatType === 3;
      const isDistant = chatType === 2;
      const canTalk = !isDistant || (ChatLobbyModel.distantChatStatus && ChatLobbyModel.distantChatStatus.status === 2);
      return m('.chat-hub-conversation-layout', [
        m('.chat-hub-conversation-main', [
          m(
            '.chat-hub-messages' + (isRoom ? '.compact-container' : ''),
            {
              oncreate: () => scrollChatToBottom(),
              onupdate: () => scrollChatToBottom(),
            },
            ChatLobbyModel.messages
          ),
          m(
            '.chat-hub-input-area',
            [
              m(
                'button.chat-hub-action-btn',
                {
                  disabled: !canTalk,
                  style: !canTalk ? 'opacity: 0.5; cursor: not-allowed;' : '',
                  title: 'Attach file',
                  onclick: () => {
                    ChatHubState.showAttachModal = true;
                    ChatHubState.showEmojiPicker = false;
                  }
                },
                m('i.fas.fa-paperclip')
              ),
              m('.emoji-picker-wrapper', [
                m(
                  'button.chat-hub-action-btn',
                  {
                    disabled: !canTalk,
                    style: !canTalk ? 'opacity: 0.5; cursor: not-allowed;' : '',
                    title: 'Insert emoji',
                    onclick: (e) => {
                      e.stopPropagation();
                      ChatHubState.showEmojiPicker = !ChatHubState.showEmojiPicker;
                    },
                  },
                  m('i.fas.fa-smile')
                ),
                ChatHubState.showEmojiPicker && m(chatEmoji.EmojiPicker),
              ]),
              m('label.chat-hub-action-btn', {
                title: 'Send image',
                style: `cursor: ${canTalk ? 'pointer' : 'not-allowed'}; opacity: ${canTalk ? 1 : 0.5};`,
              }, [
                m('i.fas.fa-image'),
                m('input[type=file][accept=image/*]', {
                  style: 'display: none;',
                  disabled: !canTalk,
                  onchange: (e) => {
                    if (!e.target.files || !e.target.files[0]) return;
                    const file = e.target.files[0];
                    const textarea = e.target.closest('.chat-hub-input-area').querySelector('textarea');
                    formatChatImage(file, (imgTag) => {
                      if (imgTag && textarea) {
                        const start = textarea.selectionStart || 0;
                        const end = textarea.selectionEnd || 0;
                        const val = textarea.value;
                        textarea.value = val.substring(0, start) + imgTag + val.substring(end);
                        m.redraw();
                      }
                    });
                    e.target.value = '';
                  }
                })
              ]),
              m('textarea.chat-hub-textarea', {
                placeholder: 'Type a message...',
                disabled: !canTalk,
                enterkeyhint: 'send',
                onpaste: (e) => {
                  if (!canTalk) return;
                  const items = (e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData))?.items;
                  if (!items) return;
                  for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                      e.preventDefault();
                      const blob = items[i].getAsFile();
                      const textarea = e.target;
                      formatChatImage(blob, (imgTag) => {
                        if (imgTag && textarea) {
                          const start = textarea.selectionStart || 0;
                          const end = textarea.selectionEnd || 0;
                          const val = textarea.value;
                          textarea.value = val.substring(0, start) + imgTag + val.substring(end);
                          m.redraw();
                        }
                      });
                      break;
                    }
                  }
                },
                onkeydown: (e) => {
                  if ((e.key === 'Enter' || e.keyCode === 13) && !e.shiftKey) {
                    if (!canTalk) return false;
                    const msg = e.target.value;
                    if (msg.trim() === '') return false;
                    e.target.value = ' sending ... ';
                    ChatLobbyModel.sendMessage(msg, () => {
                      e.target.value = '';
                      scrollChatToBottom();
                    });
                    return false;
                  }
                },
              }),
              m(
                'button.chat-hub-send-btn',
                {
                  disabled: !canTalk,
                  style: !canTalk ? 'opacity: 0.5; cursor: not-allowed;' : '',
                  onclick: (e) => {
                    if (!canTalk) return;
                    const textarea = e.target.closest('.chat-hub-input-area').querySelector('textarea');
                    const msg = textarea.value;
                    if (msg.trim() === '') return;
                    textarea.value = ' sending ... ';
                    ChatLobbyModel.sendMessage(msg, () => {
                      textarea.value = '';
                      scrollChatToBottom();
                    });
                  },
                },
                m('i.fas.fa-paper-plane')
              ),
            ]
          ),
          ChatHubState.showAttachModal && m('.attach-modal-overlay', {
            onclick: (e) => {
              if (e.target === e.currentTarget && !ChatHubState.isHashing) {
                ChatHubState.showAttachModal = false;
                ChatHubState.attachPath = '';
                ChatHubState.attachBrowseHint = false;
                ChatHubState.hashingError = '';
              }
            }
          }, [
            m('.attach-modal', [
              m('.attach-modal-header', [
                m('i.fas.fa-paperclip.attach-modal-icon'),
                m('h4', 'Attach File to Chat'),
              ]),
              m('p', 'Browse for a file or type the absolute path on your local system:'),
              m('input#attach-file-picker[type=file]', {
                style: 'display:none',
                onchange: (e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) {
                    const fullPath = file.path;
                    const hasFullPath = fullPath && (fullPath.includes('/') || fullPath.includes('\\')) && fullPath !== file.name;
                    if (hasFullPath) {
                      ChatHubState.attachPath = fullPath;
                      ChatHubState.attachBrowseHint = false;
                    } else {
                      ChatHubState.attachPath = file.name;
                      ChatHubState.attachBrowseHint = true;
                    }
                    e.target.value = '';
                    ChatHubState.hashingError = '';
                    m.redraw();
                  }
                },
              }),
              m('.attach-path-row', [
                m('input[type=text]', {
                  placeholder: 'e.g. C:\\Downloads\\file.zip',
                  value: ChatHubState.attachPath,
                  oninput: (e) => {
                    ChatHubState.attachPath = e.target.value;
                    ChatHubState.attachBrowseHint = false;
                  },
                  disabled: ChatHubState.isHashing,
                }),
                m('button.attach-browse-btn', {
                  type: 'button',
                  disabled: ChatHubState.isHashing,
                  title: 'Browse for file',
                  onclick: () => {
                    const picker = document.getElementById('attach-file-picker');
                    if (picker) picker.click();
                  },
                },
                  [m('i.fas.fa-folder-open'), m('span', ' Browse…')]
                ),
              ]),
              ChatHubState.attachBrowseHint && m('.attach-path-hint', [
                m('i.fas.fa-info-circle'),
                m('span', [
                  ' Your browser cannot expose the full file path. ',
                  m('strong', 'Edit the path above'),
                  ' and add your folder prefix — e.g. change ',
                  m('code', 'file.zip'),
                  ' to ',
                  m('code', 'C:\\Downloads\\file.zip'),
                  ' — then click Attach.',
                ]),
              ]),
              ChatHubState.isHashing && m('.hashing-spinner', [
                m('i.fas.fa-spinner.fa-spin'),
                m('span', ' Hashing file... Please wait.')
              ]),
              !ChatHubState.attachBrowseHint && ChatHubState.hashingError && m('p.error-text', ChatHubState.hashingError),
              m('.modal-buttons', [
                m('button.btn.blue', {
                  disabled: ChatHubState.isHashing || !ChatHubState.attachPath.trim() || ChatHubState.attachBrowseHint,
                  onclick: () => {
                    const path = ChatHubState.attachPath.trim();
                    ChatHubState.isHashing = true;
                    ChatHubState.hashingError = '';
                    m.redraw();

                    rs.rsJsonApiRequest('/rsFiles/ExtraFileHash', {
                      localpath: path,
                      period: 86400 * 7,
                      flags: 0
                    }, (data, success) => {
                      if (success && data.retval) {
                        pollHashStatus(path);
                      } else {
                        ChatHubState.isHashing = false;
                        ChatHubState.hashingError = 'Failed to initiate file hashing. Check the path and try again.';
                        m.redraw();
                      }
                    });
                  }
                }, [m('i.fas.fa-link'), m('span', ' Attach')]),
                m('button.btn.red', {
                  disabled: ChatHubState.isHashing,
                  onclick: () => {
                    ChatHubState.showAttachModal = false;
                    ChatHubState.attachPath = '';
                    ChatHubState.attachBrowseHint = false;
                    ChatHubState.hashingError = '';
                  }
                }, 'Cancel')
              ])
            ])
          ]),
          m(HistoryBrowserModal, { isRoom: true }),
        ]),
        m('.chat-hub-rightbar', [
          m('.rightbar-title', 'Participants'),
          m('.rightbar-users-list', (() => {
            const sortedUsers = [...ChatLobbyModel.users];
            if (ChatHubState.userSortMethod === 'activity') {
              sortedUsers.sort((a, b) => b.lastAct - a.lastAct);
            } else {
              sortedUsers.sort((a, b) => a.name.localeCompare(b.name));
            }
            return sortedUsers.map((user) => {
              const gxsId = user.key;
              const name = user.name;

              if (gxsId && ChatHubState.gxsDetails[gxsId] === undefined) {
                ChatHubState.gxsDetails[gxsId] = null;
                rs.rsJsonApiRequest('/rsIdentity/getIdDetails', { id: gxsId }, (data) => {
                  if (data && data.details) {
                    ChatHubState.gxsDetails[gxsId] = data.details;
                    m.redraw();
                  }
                });
              }

              const details = ChatHubState.gxsDetails[gxsId];
              const avatar = getSafeAvatar(details);
              const firstLetter = (name || '?').slice(0, 1).toUpperCase();

              const opinion = details && details.mReputation ? details.mReputation.mOwnOpinion : 1;
              const isBanned = opinion === 0;
              if (isBanned) return null;

              const now = Math.floor(Date.now() / 1000);
              const tLastAct = user.lastAct || 0;
              const isOwn = gxsId === rs.idToHex(ChatLobbyModel.currentLobby.gxs_id || '');
              const isMuted = ChatHubState.mutedUsers && ChatHubState.mutedUsers.has(gxsId);

              let statusColor = '#22c55e';
              let statusTooltip = 'Active';

              if (isMuted) {
                statusColor = '#ef4444';
                statusTooltip = 'Muted';
              } else if (isOwn) {
                statusColor = '#3ba4d7';
                statusTooltip = 'You';
              } else if (tLastAct + 600 < now) {
                statusColor = '#cbd5e1';
                statusTooltip = 'Inactive';
              } else if (tLastAct + 300 < now) {
                statusColor = '#eab308';
                statusTooltip = 'Away';
              }

              return m('.user', {
                onmouseenter: (e) => {
                  if (ChatHubState.activeMenu) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  ChatHubState.hoveredUser = { gxsId, name, rect };
                },
                onmouseleave: () => {
                  ChatHubState.hoveredUser = null;
                },
                onclick: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  ChatHubState.hoveredUser = null;
                  ChatHubState.activeMenu = null;
                  m.redraw();
                },
                oncontextmenu: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  ChatHubState.hoveredUser = null;

                  const rect = e.currentTarget.getBoundingClientRect();
                  const rightbar = document.querySelector('.chat-hub-rightbar');
                  if (rightbar) {
                    const parentRect = rightbar.getBoundingClientRect();
                    const itemBottom = rect.bottom - parentRect.top;
                    const estimatedMenuHeight = 310;
                    let top = itemBottom;
                    if (itemBottom + estimatedMenuHeight > parentRect.height) {
                      top = rect.top - parentRect.top - estimatedMenuHeight;
                      if (top < 10) top = 10;
                    }
                    ChatHubState.activeMenu = { gxsId, name, top };
                    m.redraw();
                  }
                }
              }, [
                m(peopleUtil.UserAvatar, { avatar, firstLetter, identityId: gxsId, size: 32 }),
                m('span.user-name', name),
                (() => {
                  if (isBanned) {
                    return m('i.fas.fa-ban', {
                      style: {
                        color: '#ef4444',
                        fontSize: '0.85rem',
                        marginLeft: 'auto',
                        flexShrink: 0,
                      },
                      title: 'Banned'
                    });
                  }
                  if (isMuted) {
                    return m('i.fas.fa-volume-mute', {
                      style: {
                        color: '#ef4444',
                        fontSize: '0.85rem',
                        marginLeft: 'auto',
                        flexShrink: 0,
                      },
                      title: 'Muted'
                    });
                  }
                  if (statusColor !== '#22c55e') {
                    return m('i.fas.fa-circle', {
                      style: {
                        color: statusColor,
                        fontSize: '0.65rem',
                        marginLeft: 'auto',
                        flexShrink: 0,
                        transition: 'color 0.3s ease',
                      },
                      title: statusTooltip
                    });
                  }
                  return null;
                })(),
              ]);
            });
          })()),
          ChatHubState.hoveredUser && renderUserTooltip(ChatHubState.hoveredUser.gxsId, ChatHubState.hoveredUser.name),
          ChatHubState.activeMenu && (() => {
            const menu = ChatHubState.activeMenu;
            const isOwn = menu.gxsId === rs.idToHex(ChatLobbyModel.currentLobby.gxs_id || '');
            const isMuted = ChatHubState.mutedUsers && ChatHubState.mutedUsers.has(menu.gxsId);

            return [
              m('.menu-backdrop', {
                style: {
                  position: 'fixed',
                  inset: 0,
                  zIndex: 9998,
                },
                onclick: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  ChatHubState.activeMenu = null;
                  m.redraw();
                },
                oncontextmenu: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  ChatHubState.activeMenu = null;
                  m.redraw();
                },
              }),
              m('.rightbar-context-menu', {
                style: {
                  top: `${menu.top}px`,
                },
                onclick: (e) => {
                  e.stopPropagation();
                }
              }, [
              m('.menu-item', {
                onclick: () => {
                  ChatHubState.userSortMethod = 'activity';
                  ChatHubState.activeMenu = null;
                  m.redraw();
                }
              }, [
                m('i.fas.fa-circle', {
                  style: {
                    color: '#000',
                    marginRight: '0.5rem',
                    fontSize: '0.4rem',
                    width: '18px',
                    textAlign: 'center',
                    visibility: ChatHubState.userSortMethod === 'activity' ? 'visible' : 'hidden'
                  }
                }),
                'Sort by Activity'
              ]),
              m('.menu-item', {
                onclick: () => {
                  ChatHubState.userSortMethod = 'name';
                  ChatHubState.activeMenu = null;
                  m.redraw();
                }
              }, [
                m('i.fas.fa-circle', {
                  style: {
                    color: '#000',
                    marginRight: '0.5rem',
                    fontSize: '0.4rem',
                    width: '18px',
                    textAlign: 'center',
                    visibility: ChatHubState.userSortMethod === 'name' ? 'visible' : 'hidden'
                  }
                }),
                'Sort by Name'
              ]),
              m('hr', { style: 'margin: 0.25rem 0; border: none; border-top: 1px solid #e2e8f0;' }),
              !isOwn && m('.menu-item', {
                onclick: () => {
                  ChatHubState.activeMenu = null;
                  people.setSelectedId(menu.gxsId, 'chat');
                }
              }, [
                m('i.fas.fa-comments', { style: 'color: #3b82f6; margin-right: 0.5rem; width: 18px; text-align: center;' }),
                'Start private chat'
              ]),
              !isOwn && m('.menu-item', {
                onclick: () => {
                  ChatHubState.activeMenu = null;
                  people.setSelectedId(menu.gxsId, 'details', true);
                }
              }, [
                m('i.fas.fa-envelope', { style: 'color: #10b981; margin-right: 0.5rem; width: 18px; text-align: center;' }),
                'Send Message'
              ]),
              !isOwn && m('hr', { style: 'margin: 0.25rem 0; border: none; border-top: 1px solid #e2e8f0;' }),
              !isOwn && m('.menu-item', {
                onclick: () => {
                  if (isMuted) {
                    ChatHubState.mutedUsers.delete(menu.gxsId);
                  } else {
                    ChatHubState.mutedUsers.add(menu.gxsId);
                  }
                  ChatHubState.activeMenu = null;
                  m.redraw();
                }
              }, [
                m('i', {
                  class: isMuted ? 'fas fa-volume-up' : 'fas fa-volume-mute',
                  style: {
                    color: isMuted ? '#22c55e' : '#ef4444',
                    marginRight: '0.5rem',
                    fontSize: '0.95rem',
                    width: '18px',
                    textAlign: 'center'
                  }
                }),
                isMuted ? 'Unmute participant' : 'Mute participant'
              ]),
              !isOwn && m('.menu-item', {
                onclick: () => {
                  ChatHubState.activeMenu = null;
                  rs.rsJsonApiRequest('/rsreputations/setOwnOpinion', { id: menu.gxsId, op: 2 }, (data, success) => {
                    if (success) {
                      if (!ChatHubState.gxsDetails[menu.gxsId]) ChatHubState.gxsDetails[menu.gxsId] = { mReputation: {} };
                      if (!ChatHubState.gxsDetails[menu.gxsId].mReputation) ChatHubState.gxsDetails[menu.gxsId].mReputation = {};
                      ChatHubState.gxsDetails[menu.gxsId].mReputation.mOwnOpinion = 2;
                      m.redraw();
                      rs.rsJsonApiRequest('/rsIdentity/getIdDetails', { id: menu.gxsId }, (d) => {
                        if (d && d.details) {
                          ChatHubState.gxsDetails[menu.gxsId] = d.details;
                          m.redraw();
                        }
                      });
                    }
                  });
                }
              }, [
                m('span', { style: 'background-color: #22c55e; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; margin-right: 0.5rem; font-size: 0.7rem; color: #ffffff;' }, m('i.fas.fa-thumbs-up')),
                'Give positive opinion'
              ]),
              !isOwn && m('.menu-item', {
                onclick: () => {
                  ChatHubState.activeMenu = null;
                  rs.rsJsonApiRequest('/rsreputations/setOwnOpinion', { id: menu.gxsId, op: 1 }, (data, success) => {
                    if (success) {
                      if (!ChatHubState.gxsDetails[menu.gxsId]) ChatHubState.gxsDetails[menu.gxsId] = { mReputation: {} };
                      if (!ChatHubState.gxsDetails[menu.gxsId].mReputation) ChatHubState.gxsDetails[menu.gxsId].mReputation = {};
                      ChatHubState.gxsDetails[menu.gxsId].mReputation.mOwnOpinion = 1;
                      m.redraw();
                      rs.rsJsonApiRequest('/rsIdentity/getIdDetails', { id: menu.gxsId }, (d) => {
                        if (d && d.details) {
                          ChatHubState.gxsDetails[menu.gxsId] = d.details;
                          m.redraw();
                        }
                      });
                    }
                  });
                }
              }, [
                m('span', { style: 'background-color: #f59e0b; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; margin-right: 0.5rem; font-size: 0.7rem; color: #ffffff;' }, m('i.fas.fa-hand-paper')),
                'Give neutral opinion'
              ]),
              !isOwn && m('.menu-item', {
                onclick: () => {
                  ChatHubState.activeMenu = null;
                  rs.rsJsonApiRequest('/rsreputations/setOwnOpinion', { id: menu.gxsId, op: 0 }, (data, success) => {
                    if (success) {
                      if (!ChatHubState.gxsDetails[menu.gxsId]) ChatHubState.gxsDetails[menu.gxsId] = { mReputation: {} };
                      if (!ChatHubState.gxsDetails[menu.gxsId].mReputation) ChatHubState.gxsDetails[menu.gxsId].mReputation = {};
                      ChatHubState.gxsDetails[menu.gxsId].mReputation.mOwnOpinion = 0;
                      m.redraw();
                      rs.rsJsonApiRequest('/rsIdentity/getIdDetails', { id: menu.gxsId }, (d) => {
                        if (d && d.details) {
                          ChatHubState.gxsDetails[menu.gxsId] = d.details;
                          m.redraw();
                        }
                      });
                    }
                  });
                }
              }, [
                m('span', { style: 'background-color: #ef4444; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; margin-right: 0.5rem; font-size: 0.7rem; color: #ffffff;' }, m('i.fas.fa-thumbs-down')),
                'Ban this person (Sets negative opinion)'
              ]),
              m('.menu-item', {
                onclick: () => {
                  ChatHubState.activeMenu = null;
                  people.setSelectedId(menu.gxsId, 'details');
                }
              }, [
                m('i.fas.fa-user', { style: 'color: #8b5cf6; margin-right: 0.5rem; width: 18px; text-align: center;' }),
                'Show author in people tab'
              ])
            ])];
          })()
        ])
      ]);
    },
  };
};

// ***************************** Page Layouts ******************************

function getLobbyPrivacyInfo(room) {
  if (!room) return { type: 'Public', security: 'Anonymous IDs accepted' };

  const flags =
    room.lobby_privacy_type !== undefined
      ? room.lobby_privacy_type
      : room.lobby_privacy_level !== undefined
      ? room.lobby_privacy_level
      : room.privacy_type !== undefined
      ? room.privacy_type
      : room.lobby_privacy !== undefined
      ? room.lobby_privacy
      : room.privacy_level !== undefined
      ? room.privacy_level
      : room.lobby_flags !== undefined
      ? room.lobby_flags
      : 0;

  let isPublic =
    (flags & 4) !== 0 ||
    (flags & 1) !== 0 ||
    ChatHubState.selectedRoomType === 'public' ||
    room.is_public === true;

  if (flags === 1 || flags === 2) {
    if ((flags & 1) === 1 && (flags & 4) === 0 && ChatHubState.selectedRoomType !== 'public') {
      isPublic = false;
    }
  }

  const typeStr = isPublic ? 'Public' : 'Private';
  const isAuthOnly = (flags & 8) !== 0;
  const securityStr = isAuthOnly ? 'No anonymous IDs' : 'Anonymous IDs accepted';

  return {
    type: typeStr,
    security: securityStr,
  };
}

const ChatRoomDetailView = () => {
  return {
    view: () => {
      const room = ChatHubState.selectedRoom;
      if (!room) return null;

      let participants = [];

      if (room.gxs_ids) {
        if (Array.isArray(room.gxs_ids)) {
          participants = room.gxs_ids.map((u) => ({
            key: u.key,
            name: rs.userList.username(u.key) || u.key
          }));
        } else if (typeof room.gxs_ids === 'object') {
          participants = Object.keys(room.gxs_ids).map((key) => ({
            key,
            name: rs.userList.username(key) || key
          }));
        }
      }

      const ownId = room.gxs_id;
      if (ownId && ownId !== '00000000000000000000000000000000') {
        const hasOwn = participants.some((p) => p.key === ownId);
        if (!hasOwn) {
          participants.push({
            key: ownId,
            name: rs.userList.username(ownId) || ownId
          });
        }
      }

      const participantCount = participants.length;
      const participantNames = participants.map((p) => p.name).sort((a, b) => a.localeCompare(b));

      const lobbyHexId = rs.idToHex(room.lobby_id);
      const privacy = getLobbyPrivacyInfo(room);


      return m('.chat-room-detail-view', [
        m('.detail-section', [
          m('h3', 'Room Info'),
          m('.info-grid', [
            m('.info-label', 'Room Name'),
            m('.info-value', room.lobby_name || '<unnamed>'),
            m('.info-label', 'Topic'),
            m('.info-value', room.lobby_topic || 'None'),
            m('.info-label', 'Type'),
            m('.info-value', privacy.type),
            m('.info-label', 'Security'),
            m('.info-value', privacy.security),
            m('.info-label', 'Participants'),
            m('.info-value', participantCount + ' users'),
            m('.info-label', 'Your Identity'),
            m('.info-value', rs.userList.username(room.gxs_id) || room.gxs_id || '???'),
            m('.info-label', 'Lobby ID'),
            m('.info-value', lobbyHexId),
          ]),
        ]),

        m('.detail-section', [
          m('h3', 'Participants (' + participantCount + ')'),
          participantNames.length > 0
            ? m(
                '.participants-grid',
                participantNames.map((name) =>
                  m('.participant-card', m('.participant-name', name))
                )
              )
            : m('p.no-participants', 'No participant information available'),
        ]),
      ]);
    },
  };
};

const ChatRoomJoinView = () => {
  let ownIds = [];
  return {
    oninit: () => peopleUtil.ownIds((data) => (ownIds = data)),
    view: () => {
      const room = ChatHubState.selectedRoom;
      if (!room) return null;

      const lobbyHexId = rs.idToHex(room.lobby_id);
      const participantCount = room.total_number_of_peers || 0;
      const privacy = getLobbyPrivacyInfo(room);

      return m('.chat-room-detail-view', [
        m('.detail-section', [
          m('h3', 'Room Info'),
          m('.info-grid', [
            m('.info-label', 'Room Name'),
            m('.info-value', room.lobby_name || '<unnamed>'),
            m('.info-label', 'Topic'),
            m('.info-value', room.lobby_topic || 'None'),
            m('.info-label', 'Type'),
            m('.info-value', privacy.type),
            m('.info-label', 'Security'),
            m('.info-value', privacy.security),
            m('.info-label', 'Participants'),
            m('.info-value', participantCount + ' users'),
          ]),
        ]),


        m('.detail-section', [
          m('h3', 'Join Room'),
          m('p.join-description', 'Select an identity to join this chat room:'),
          m(
            '.identities-grid',
            ownIds.map((nick) =>
              m(
                '.identity-card',
                { onclick: () => ChatLobbyModel.enterPublicLobby(lobbyHexId, nick) },
                [
                  m('.identity-name', rs.userList.username(nick) || nick),
                  m('i.fas.fa-sign-in-alt'),
                ]
              )
            )
          ),
        ]),
      ]);
    },
  };
};

const Layout = {
  dismissMenu: () => {
    let redraw = false;
    if (ChatHubState.activeMenu) {
      ChatHubState.activeMenu = null;
      redraw = true;
    }
    if (ChatHubState.messageContextMenu && ChatHubState.messageContextMenu.show) {
      ChatHubState.messageContextMenu.show = false;
      redraw = true;
    }
    if (redraw) m.redraw();
  },
  oninit: () => {
    ChatHubState.activeTab = 'chat';
    const lobbyId = m.route.param('lobby');
    if (lobbyId) {
      ChatHubState.selectedRoomId = lobbyId;
      ChatLobbyModel.loadLobby(lobbyId);
    }
    window.addEventListener('click', Layout.dismissMenu);

    peopleUtil.ownIds((ids) => {
      ChatHubState.ownGxsIdentities = ids || [];
      if (ChatHubState.ownGxsIdentities.length > 0) {
        ChatHubState.newRoomIdentity = ChatHubState.ownGxsIdentities[0];
      }
      ChatHubState.ownGxsIdentities.forEach((id) => {
        if (ChatHubState.gxsDetails[id] === undefined) {
          rs.rsJsonApiRequest('/rsIdentity/getIdDetails', { id }, (data) => {
            if (data && data.details) {
              ChatHubState.gxsDetails[id] = data.details;
              m.redraw();
            }
          });
        }
      });
      m.redraw();
    });
  },
  onupdate: () => {
    const lobbyId = m.route.param('lobby');
    if (lobbyId && ChatHubState.selectedRoomId !== lobbyId) {
      ChatHubState.selectedRoomId = lobbyId;
      ChatLobbyModel.loadLobby(lobbyId);
    }
  },
  onremove: () => {
    ChatLobbyModel.stopStatusPolling();
    window.removeEventListener('click', Layout.dismissMenu);
  },
  view: () => {
    const search = ChatHubState.searchString.toLowerCase();

    const subscribedRooms = sortLobbies(
      Object.values(ChatRoomsModel.subscribedRooms)
    ).filter((info) => (info.lobby_name || '').toLowerCase().includes(search));

    const publicRooms = (ChatRoomsModel.allRooms || [])
      .filter((info) => !ChatRoomsModel.subscribed(info))
      .filter((info) => (info.lobby_name || '').toLowerCase().includes(search));

    const isSelected = (info, type) =>
      ChatHubState.selectedRoomId === rs.idToHex(info.lobby_id);

    const lobbyId = ChatHubState.selectedRoomId;
    let selectedRoom = null;
    let selectedRoomType = null;

    if (lobbyId) {
      if (ChatRoomsModel.subscribedRooms[lobbyId]) {
        selectedRoom = ChatRoomsModel.subscribedRooms[lobbyId];
        selectedRoomType = 'subscribed';
      } else {
        selectedRoom = ChatRoomsModel.allRooms.find(
          (r) => rs.idToHex(r.lobby_id) === lobbyId
        );
        if (selectedRoom) {
          selectedRoomType = 'public';
        } else if (
          ChatLobbyModel.currentLobby &&
          rs.idToHex(ChatLobbyModel.currentLobby.lobby_id || '') === lobbyId
        ) {
          selectedRoom = ChatLobbyModel.currentLobby;
          selectedRoomType = 'subscribed';
        }
      }
    }

    if (selectedRoom) {
      ChatHubState.selectedRoom = selectedRoom;
      ChatHubState.selectedRoomType = selectedRoomType;
    } else if (!m.route.param('lobby')) {
      ChatHubState.selectedRoom = null;
      ChatHubState.selectedRoomId = null;
      ChatHubState.selectedRoomType = null;
    }

    return m('.chat-hub-container', [
      m('.chat-hub-left-pane', [
        m('.chat-own-profile-card', [
          m('.profile-header', [
            m('i.fas.fa-comments', { style: { fontSize: '1.5rem', color: '#3ba4d7' } }),
            m('.profile-info', [
              m('.profile-name', 'Chat rooms'),
            ]),
          ]),
          m('button.chat-create-lobby-btn', {
            onclick: () => {
              ChatHubState.showCreateRoomModal = true;
            }
          }, [
            m('i.fas.fa-plus'),
            ' Create'
          ])
        ]),

        m('.chat-rooms-list-container', [
          m('.searchbar-container', [
            m('input.searchbar', {
              type: 'text',
              placeholder: 'Search chat rooms...',
              value: ChatHubState.searchString,
              oninput: (e) => {
                ChatHubState.searchString = e.target.value;
              },
            }),
          ]),
          m('.rooms-scroll', [
            subscribedRooms.length > 0 && [
              m('.rooms-section-title', [
                m('i.fas.fa-bookmark'),
                m('span', 'Subscribed (' + subscribedRooms.length + ')'),
              ]),
              subscribedRooms.map((info) => {
                const hexId = rs.idToHex(info.lobby_id);
                let count = 0;
                let hasOwn = false;
                if (info.gxs_ids) {
                  if (Array.isArray(info.gxs_ids)) {
                    count = info.gxs_ids.length;
                    hasOwn = info.gxs_ids.some((u) => u.key === info.gxs_id);
                  } else if (typeof info.gxs_ids === 'object') {
                    count = Object.keys(info.gxs_ids).length;
                    hasOwn = info.gxs_ids[info.gxs_id] !== undefined;
                  }
                }
                if (!hasOwn && info.gxs_id && info.gxs_id !== '00000000000000000000000000000000') {
                  count++;
                }
                return m(
                  '.chat-room-list-item' +
                    (isSelected(info, 'subscribed') ? '.selected' : ''),
                  {
                    key: hexId,
                    onclick: () => {
                      m.route.set('/chat/:lobby', { lobby: hexId });
                    },
                  },
                  [
                    m('.room-icon', m('i.fas.fa-comments')),
                    m('.room-meta', [
                      m('.room-name', info.lobby_name || '<unnamed>'),
                      m('.room-topic', info.lobby_topic || 'No topic'),
                    ]),
                    count > 0 && m('.room-badge', count),
                  ]
                );
              }),
            ],

            publicRooms.length > 0 && [
              m('.rooms-section-title', [
                m('i.fas.fa-globe'),
                m('span', 'Public (' + publicRooms.length + ')'),
              ]),
              publicRooms.map((info) => {
                const hexId = rs.idToHex(info.lobby_id);
                const count = info.total_number_of_peers || 0;
                return m(
                  '.chat-room-list-item.public-room' +
                    (isSelected(info, 'public') ? '.selected' : ''),
                  {
                    key: hexId,
                    onclick: () => {
                      m.route.set('/chat/:lobby', { lobby: hexId });
                    },
                  },
                  [
                    m('.room-icon', m('i.fas.fa-globe')),
                    m('.room-meta', [
                      m('.room-name', info.lobby_name || '<unnamed>'),
                      m('.room-topic', info.lobby_topic || 'No topic'),
                    ]),
                    count > 0 && m('.room-badge', count),
                  ]
                );
              }),
            ],

            subscribedRooms.length === 0 &&
              publicRooms.length === 0 &&
              m('p.no-rooms', 'No chat rooms found'),
          ]),
        ]),
      ]),
      ChatHubState.showCreateRoomModal && m('.attach-modal-overlay', [
        m('.attach-modal', [
          m('h4', 'Create New Chat Room'),

          m('.form-field', { style: 'display: flex; flex-direction: column; gap: 0.25rem;' }, [
            m('label', { style: 'font-weight: bold; font-size: 0.9rem; color: #475569;' }, 'Room Name:'),
            m('input[type=text]', {
              value: ChatHubState.newRoomName,
              oninput: (e) => { ChatHubState.newRoomName = e.target.value; },
              placeholder: 'Enter room name',
              style: 'padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 0.25rem; font-size: 0.9rem;'
            })
          ]),

          m('.form-field', { style: 'display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.5rem;' }, [
            m('label', { style: 'font-weight: bold; font-size: 0.9rem; color: #475569;' }, 'Topic:'),
            m('input[type=text]', {
              value: ChatHubState.newRoomTopic,
              oninput: (e) => { ChatHubState.newRoomTopic = e.target.value; },
              placeholder: 'Enter room topic',
              style: 'padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 0.25rem; font-size: 0.9rem;'
            })
          ]),

          m('.form-field', { style: 'display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.5rem;' }, [
            m('label', { style: 'font-weight: bold; font-size: 0.9rem; color: #475569;' }, 'Admin Identity:'),
            m('select', {
              value: ChatHubState.newRoomIdentity,
              onchange: (e) => { ChatHubState.newRoomIdentity = e.target.value; },
              style: 'padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 0.25rem; font-size: 0.9rem; background-color: #ffffff;'
            }, [
              ChatHubState.ownGxsIdentities && ChatHubState.ownGxsIdentities.map((id) => {
                const details = ChatHubState.gxsDetails[id];
                const name = details ? (details.mNickname || details.mGroupName) : id;
                return m('option', { value: id }, name);
              })
            ])
          ]),

          m('.form-field', { style: 'display: flex; gap: 0.5rem; align-items: center; margin-top: 0.75rem;' }, [
            m('label', { style: 'display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: #475569; cursor: pointer; user-select: none;' }, [
              m('input[type=checkbox]', {
                checked: ChatHubState.newRoomPublic,
                onclick: (e) => { ChatHubState.newRoomPublic = e.target.checked; }
              }),
              'Public Room'
            ])
          ]),

          m('.form-field', { style: 'display: flex; gap: 0.5rem; align-items: center; margin-top: 0.5rem;' }, [
            m('label', { style: 'display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: #475569; cursor: pointer; user-select: none;' }, [
              m('input[type=checkbox]', {
                checked: ChatHubState.newRoomSigned,
                onclick: (e) => { ChatHubState.newRoomSigned = e.target.checked; }
              }),
              'PGP signed identities'
            ])
          ]),

          ChatHubState.createRoomError && m('p.error-text', { style: 'color: #ef4444; font-size: 0.85rem; margin: 0.5rem 0 0 0;' }, ChatHubState.createRoomError),

          m('.modal-buttons', { style: 'display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;' }, [
            m('button', {
              disabled: !ChatHubState.newRoomName.trim() || !ChatHubState.newRoomIdentity,
              onclick: () => {
                const name = ChatHubState.newRoomName.trim();
                const topic = ChatHubState.newRoomTopic.trim();
                const identity = ChatHubState.newRoomIdentity;
                const isPublic = ChatHubState.newRoomPublic;
                const isSigned = ChatHubState.newRoomSigned;
                let flags = 0;
                if (isPublic) flags |= 4;
                if (isSigned) flags |= 8;

                rs.rsJsonApiRequest('/rsChats/createChatLobby', {
                  lobby_name: name,
                  lobby_identity: identity,
                  lobby_topic: topic,
                  invited_friends: [],
                  lobby_privacy_type: flags
                }, (data, success) => {
                  if (success) {
                    ChatHubState.showCreateRoomModal = false;
                    ChatHubState.newRoomName = '';
                    ChatHubState.newRoomTopic = '';
                    ChatHubState.newRoomSigned = false;
                    ChatHubState.createRoomError = '';
                    ChatRoomsModel.loadSubscribedRooms();
                    m.redraw();
                  } else {
                    ChatHubState.createRoomError = 'Failed to create room. Check parameters.';
                    m.redraw();
                  }
                });
              }
            }, 'Create'),
            m('button.red', {
              onclick: () => {
                ChatHubState.showCreateRoomModal = false;
                ChatHubState.newRoomName = '';
                ChatHubState.newRoomTopic = '';
                ChatHubState.newRoomSigned = false;
                ChatHubState.createRoomError = '';
              }
            }, 'Cancel')
          ])
        ])
      ]),
      ChatHubState.showInviteModal && m('.attach-modal-overlay', [
        m('.attach-modal', { style: 'max-width: 450px;' }, [
          m('h4', 'Invite Friends to ' + (ChatHubState.selectedRoom ? ChatHubState.selectedRoom.lobby_name : '')),
          m('.friends-invite-list', { style: 'max-height: 250px; overflow-y: auto; margin-top: 1rem; border: 1px solid #e2e8f0; border-radius: 0.375rem; padding: 0.5rem;' }, [
            ChatHubState.friendsList.length === 0
              ? m('p', { style: 'text-align: center; color: #64748b; font-style: italic; margin: 1rem 0;' }, 'No friends available')
              : ChatHubState.friendsList.map((friend) => {
                  const isChecked = ChatHubState.selectedFriendsToInvite.has(friend.id);
                  return m('.friend-invite-item', {
                    style: 'display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid #f1f5f9; cursor: pointer;',
                    onclick: () => {
                      if (isChecked) {
                        ChatHubState.selectedFriendsToInvite.delete(friend.id);
                      } else {
                        ChatHubState.selectedFriendsToInvite.add(friend.id);
                      }
                    }
                  }, [
                    m('div', { style: 'display: flex; align-items: center; gap: 0.5rem;' }, [
                      m('.status-bullet', { style: { backgroundColor: friend.online ? '#22c55e' : '#94a3b8', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' } }),
                      m('span', { style: 'font-weight: 500;' }, friend.name)
                    ]),
                    m('input[type=checkbox]', {
                      checked: isChecked,
                      onclick: (e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                          ChatHubState.selectedFriendsToInvite.add(friend.id);
                        } else {
                          ChatHubState.selectedFriendsToInvite.delete(friend.id);
                        }
                      }
                    })
                  ]);
                })
          ]),
          m('.modal-buttons', { style: 'display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;' }, [
            m('button.blue', {
              disabled: ChatHubState.selectedFriendsToInvite.size === 0,
              onclick: () => {
                const lobbyHexId = rs.idToHex(ChatHubState.selectedRoom.lobby_id);
                const invitePromises = [];
                ChatHubState.selectedFriendsToInvite.forEach((friendId) => {
                  invitePromises.push(
                    new Promise((resolve) => {
                      rs.rsJsonApiRequest('/rsChats/invitePeerToLobby', {
                        lobby_id: lobbyHexId,
                        peer_id: friendId
                      }, () => resolve());
                    })
                  );
                });
                Promise.all(invitePromises).then(() => {
                  ChatHubState.showInviteModal = false;
                  ChatHubState.selectedFriendsToInvite.clear();
                  m.redraw();
                });
              }
            }, 'Invite'),
            m('button.red', {
              onclick: () => {
                ChatHubState.showInviteModal = false;
                ChatHubState.selectedFriendsToInvite.clear();
              }
            }, 'Cancel')
          ])
        ])
      ]),

      m('.chat-hub-right-pane', [
        ChatHubState.selectedRoom
          ? [
              ChatHubState.selectedRoomType === 'subscribed'
                ? [
                    m(ChatRoomHeader, { room: ChatHubState.selectedRoom }),
                    m('.chat-hub-tabs-container', [
                      m('.chat-hub-tabs', [
                        m(
                          'button.tab-btn' +
                            (ChatHubState.activeTab === 'chat' ? '.active' : ''),
                          {
                            onclick: () => {
                              ChatHubState.activeTab = 'chat';
                              scrollChatToBottom();
                            },
                          },
                          [m('i.fas.fa-comments'), ' Chat']
                        ),
                        m(
                          'button.tab-btn' +
                            (ChatHubState.activeTab === 'details' ? '.active' : ''),
                          {
                            onclick: () => {
                              ChatHubState.activeTab = 'details';
                            },
                          },
                          [m('i.fas.fa-info-circle'), ' Details']
                        ),
                      ]),
                    ]),
                    m('.chat-hub-tab-content', { style: { padding: ChatHubState.activeTab === 'chat' ? '0' : '1.5rem' } }, [
                      ChatHubState.activeTab === 'chat'
                        ? m(ChatConversationView)
                        : m(ChatRoomDetailView),
                    ]),
                  ]
                : [
                    m('.chat-hub-tab-content', m(ChatRoomJoinView)),
                  ],
            ]
          : m('.chat-pane-placeholder', [
              m('i.fas.fa-comments'),
              m(
                'p',
                'Select a chat room from the left panel to view details or join a conversation.'
              ),
            ]),
        ]),
      ChatHubState.messageContextMenu.show && m('.chat-msg-context-menu', {
        style: {
          top: `${Math.max(8, Math.min(ChatHubState.messageContextMenu.y, window.innerHeight - 132))}px`,
          left: `${Math.max(8, Math.min(ChatHubState.messageContextMenu.x, window.innerWidth - 228))}px`,
        },
        onclick: (e) => e.stopPropagation(),
      }, [
        m('.context-menu-item', {
          style: 'padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 0.6rem; cursor: pointer; transition: background 0.15s ease;',
          onmouseenter: (e) => (e.currentTarget.style.background = '#f1f5f9'),
          onmouseleave: (e) => (e.currentTarget.style.background = 'transparent'),
          onclick: () => {
            const { username, messageText } = ChatHubState.messageContextMenu;
            const quoteHeader = `> [${username}]: ${messageText}\n`;
            const textarea = document.querySelector('.chat-hub-input-area textarea') || document.querySelector('#msginput');
            if (textarea) {
              textarea.value = (textarea.value ? textarea.value.trim() + '\n' : '') + quoteHeader;
              textarea.focus();
            }
            ChatHubState.messageContextMenu.show = false;
            m.redraw();
          },
        }, [
          m('i.fas.fa-quote-right', { style: 'color: #3b82f6;' }),
          'Quote Message'
        ]),
        ChatHubState.messageContextMenu.gxsId &&
          ChatHubState.messageContextMenu.gxsId !== '00000000000000000000000000000000' &&
          m('.context-menu-item', {
            style: 'padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 0.6rem; cursor: pointer; transition: background 0.15s ease;',
            onmouseenter: (e) => (e.currentTarget.style.background = '#f1f5f9'),
            onmouseleave: (e) => (e.currentTarget.style.background = 'transparent'),
            onclick: () => {
              const { gxsId } = ChatHubState.messageContextMenu;
              const peopleState = require('people/people_state');
              peopleState.State.selectedId = gxsId;
              peopleState.State.activeFilter = 'all';
              peopleState.fetchIdDetails(gxsId);
              ChatHubState.messageContextMenu.show = false;
              m.route.set('/people/All');
            },
          }, [
            m('i.fas.fa-user-circle', { style: 'color: #0ea5e9;' }),
            'Show Author in People'
          ]),
        m('.context-menu-item', {
          style: 'padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 0.6rem; cursor: pointer; transition: background 0.15s ease;',
          onmouseenter: (e) => (e.currentTarget.style.background = '#f1f5f9'),
          onmouseleave: (e) => (e.currentTarget.style.background = 'transparent'),
          onclick: () => {
            const { messageText } = ChatHubState.messageContextMenu;
            navigator.clipboard.writeText(messageText);
            ChatHubState.messageContextMenu.show = false;
            m.redraw();
          },
        }, [
          m('i.fas.fa-copy', { style: 'color: #64748b;' }),
          'Copy Text'
        ]),
      ])
    ]);
  },
};

/*
    /rsChats/initiateDistantChatConnexion
   * @param[in] to_pid RsGxsId to start the connection
   * @param[in] from_pid owned RsGxsId who start the connection
   * @param[out] pid distant chat id
   * @param[out] error_code if the connection can't be stablished
   * @param[in] notify notify remote that the connection is stablished
*/
const LayoutCreateDistant = () => {
  let ownIds = [];
  return {
    oninit: () => peopleUtil.ownIds((data) => (ownIds = data)),
    view: (vnode) =>
      m('.node-panel.chat-panel.chat-room', [
        m('.createDistantChat', [
          'choose identitiy to chat with ',
          rs.userList.username(m.route.param('lobby')),
          ownIds.map((id) =>
            m(
              '.identity',
              {
                onclick: () =>
                  rs.rsJsonApiRequest(
                    '/rsChats/initiateDistantChatConnexion',
                    {
                      to_pid: m.route.param('lobby'),
                      from_pid: id,
                      notify: true,
                    },
                    (res) => {
                      m.route.set('/chat/:lobby', { lobby: rs.idToHex(res.pid) });
                    }
                  ),
              },
              rs.userList.username(id)
            )
          ),
        ]),
      ]),
  };
};

module.exports = {
  oninit: () => {
    ChatRoomsModel.loadSubscribedRooms();
    loadOwnChatProfile();
  },
  view: (vnode) => {
    if (m.route.param('subaction') === 'createdistantchat') {
      return m(LayoutCreateDistant);
    } else {
      return m(Layout);
    }
  },
};
 
}); 
require.register("chat/chat_emoji", function(exports, require, module) { 
const m = require('mithril');

const EMOJI_CATEGORIES = ['Smileys', 'People', 'Animals', 'Food', 'Travel', 'Activities', 'Objects', 'Symbols'];
const EMOJI_ICONS = {
  Smileys: '😊', People: '👥', Animals: '🐾', Food: '🍎',
  Travel: '✈️', Activities: '⚽', Objects: '💡', Symbols: '❤️',
};
const EMOJI_DATA = {
  Smileys: [
    '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '😘', '🥰', '😗', '😙', '😚',
    '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '🥱',
    '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖', '😞', '😟',
    '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡', '😠',
    '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥴', '😇', '🥳', '🥺', '🤠', '🤡', '🤥', '🤫', '🤭', '🧐', '🤓',
    '😈', '👿', '👹', '👺', '💀', '☠️', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
  ],
  People: [
    '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇',
    '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾',
    '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🫀', '🫁', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '🫦', '👶', '🧒',
    '👦', '👧', '🧑', '👱', '👨', '🧔', '👩', '🧓', '👴', '👵', '🙍', '🙎', '🙅', '🙆', '💁', '🙋', '🧏', '🙇',
    '🤦', '🤷', '👮', '🕵️', '💂', '🥷', '👷', '🫅', '🤴', '👸', '👲', '🧕', '🤵', '👰', '🤰', '🫃', '🫄', '🤱',
    '👼', '🎅', '🤶', '🧑‍🎄', '🦸', '🦹', '🧙', '🧝', '🧛', '🧟', '🧞', '🧜', '🧚', '🧑‍🤝‍🧑', '👫', '👬', '👭', '💏', '💑', '👪',
  ],
  Animals: [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉',
    '🙊', '🐒', '🦆', '🦅', '🦉', '🦇', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪲', '🦗', '🪳', '🕷️', '🦂',
    '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🦭',
    '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄',
    '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦤', '🦚', '🦜',
    '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔', '🐾', '🐉', '🐲', '🌵',
  ],
  Food: [
    '🍎', '🍊', '🍋', '🍌', '🍍', '🥭', '🍓', '🍒', '🍑', '🥝', '🍅', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️',
    '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🫓', '🥨', '🧀', '🥚', '🍳', '🧈',
    '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫔', '🌮', '🌯', '🥙', '🧆', '🥚', '🍱',
    '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦪', '🍦',
    '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🫖', '🍵',
    '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊', '🥄', '🍴', '🍽️', '🥢',
  ],
  Travel: [
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛺',
    '🚲', '🛴', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄',
    '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️',
    '🛳️', '⛴️', '🚢', '⚓', '🗺️', '🧭', '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🏟️', '🏛️', '🏗️',
    '🧱', '🪨', '🪵', '🛖', '🏘️', '🏚️', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬',
    '🏭', '🏯', '🏰', '💒', '🗼', '🗽', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋', '⛲', '⛺', '🌁', '🌃', '🏙️', '🌄',
  ],
  Activities: [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅',
    '⛳', '🪁', '🛝', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️',
    '🤼', '🤸', '⛹️', '🤺', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅',
    '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🖼️', '🎰', '🎲', '🧩', '🪄', '🎯', '🪅', '🎮',
    '🕹️', '🎳', '🎻', '🎷', '🥁', '🪘', '🎺', '🎸', '🪗', '🎹', '🎵', '🎶', '🎼', '🎤', '🎧', '📻', '🎙️', '🎚️',
    '🎬', '📽️', '🎞️', '📱', '📲', '☎️', '📞', '📟', '📠', '🔋', '🪫', '🔌', '💡', '🔦', '🕯️', '💸', '💵', '🪙',
  ],
  Objects: [
    '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💾', '💿', '📀', '🧮', '📷', '📸', '📹', '🎥', '📽️',
    '📞', '☎️', '📟', '📠', '📺', '📻', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🪫', '🔌', '💡',
    '🔦', '🕯️', '🪔', '🧱', '💰', '💴', '💵', '💶', '💷', '💸', '💳', '🪙', '💹', '✉️', '📧', '📨', '📩', '📤',
    '📥', '📦', '📫', '📪', '📬', '📭', '📮', '🗳️', '✏️', '✒️', '🖊️', '🖋️', '📝', '📁', '📂', '🗂️', '📅', '📆',
    '🗒️', '🗓️', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '🗺️', '📏', '📐', '✂️', '🗃️', '🗄️', '🗑️', '🔒', '🔓',
    '🔏', '🔐', '🔑', '🗝️', '🔨', '🪓', '⛏️', '⚒️', '🛠️', '🗡️', '⚔️', '🔫', '🪃', '🏹', '🛡️', '🪚', '🔧', '🪛',
  ],
  Symbols: [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
    '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌',
    '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺',
    '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘',
    '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕',
    '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '📶', '🛜', '📳', '📴', '🔱', '📛', '🔰', '♻️', '✅', '🈯', '💹', '❎',
    '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🈳', '🈹', '🚰', '🔤', '🔡', '🔠', '🆖', '🆗',
    '🆙', '🆒', '🆕', '🆓', '🔟', '📊', '🔣', '✔️', '☑️', '🔘', '🔲', '🔳', '⬛', '⬜', '◼️', '◻️', '◾', '◽',
    '▪️', '▫️', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔲', '🔳', '🏁', '🚩', '🎌', '🏴', '🏳️', '⭐',
    '🌟', '💫', '✨', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️',
  ],
};

function insertEmojiIntoTextarea(emoji, onSelect) {
  if (typeof onSelect === 'function') {
    onSelect(emoji);
    return;
  }
  const textarea = document.querySelector('.chat-hub-textarea, .chat-textarea');
  if (!textarea) return;
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);
  textarea.value = before + emoji + after;
  const newPos = start + emoji.length;
  textarea.selectionStart = newPos;
  textarea.selectionEnd = newPos;
  textarea.focus();
}

const EmojiPicker = () => ({
  view: ({ attrs: { onSelect } }) => {
    const search = ChatHubState.emojiSearch.toLowerCase();
    const cat = ChatHubState.emojiCategory;
    let emojis;
    if (search) {
      emojis = Object.values(EMOJI_DATA).flat();
    } else {
      emojis = EMOJI_DATA[cat] || [];
    }
    return m('.emoji-picker', [
      m('.emoji-search-row', [
        m('i.fas.fa-search.emoji-search-icon'),
        m('input.emoji-search-input[type=text][placeholder=Search emoji...]', {
          value: ChatHubState.emojiSearch,
          oninput: (e) => { ChatHubState.emojiSearch = e.target.value; },
        }),
        ChatHubState.emojiSearch && m('button.emoji-search-clear', {
          onclick: () => { ChatHubState.emojiSearch = ''; },
        }, m('i.fas.fa-times')),
      ]),
      !search && m('.emoji-categories', EMOJI_CATEGORIES.map((c) =>
        m('button.emoji-cat-btn' + (c === cat ? '.active' : ''), {
          title: c,
          onclick: () => { ChatHubState.emojiCategory = c; },
        }, EMOJI_ICONS[c])
      )),
      m('.emoji-grid',
        emojis.map((e) =>
          m('button.emoji-btn', {
            onclick: () => {
              insertEmojiIntoTextarea(e, onSelect);
              ChatHubState.showEmojiPicker = false;
              m.redraw();
            },
          }, e)
        )
      ),
    ]);
  },
});

// Lazy reference set by chat.js to avoid circular dependency
let ChatHubState = null;

function setDependencies(deps) {
  ChatHubState = deps.ChatHubState;
}

module.exports = {
  EMOJI_CATEGORIES,
  EMOJI_ICONS,
  EMOJI_DATA,
  insertEmojiIntoTextarea,
  EmojiPicker,
  setDependencies,
};
 
}); 
require.register("chat/chat_state", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');

// **************** utility functions ********************

function get64Num(val) {
  if (!val) return 0;
  if (typeof val === 'object') {
    return val.xint64 || parseInt(val.xstr64) || 0;
  }
  return Number(val) || 0;
}

function loadLobbyDetails(id, apply) {
  rs.rsJsonApiRequest(
    '/rsChats/getChatLobbyInfo',
    {
      id: { xstr64: id },
    },
    (detail, success) => {
      if (success && detail.retval) {
        detail.info.chatType = 3; // LOBBY
        apply(detail.info);
      } else {
        apply(null);
      }
    },
    true
  );
}

function loadDistantChatDetails(pid, apply) {
  rs.rsJsonApiRequest(
    '/rsChats/getDistantChatStatus',
    {
      pid,
    },
    (detail, success) => {
      if (success && detail.retval) {
        const info = detail.info;
        info.chatType = 2; // DISTANT (matches TYPE_PRIVATE_DISTANT in rschats.h)
        info.lobby_name = rs.userList.username(info.to_id) || 'Distant Chat ' + pid;
        info.lobby_topic = 'Private Encrypted Chat';
        info.gxs_id = info.own_id;
        info.lobby_id = pid; // Distant IDs are 128-bit hex strings, NO xstr64 wrapper
        apply(info);
      } else {
        apply(null);
      }
    },
    true
  );
}

function sortLobbies(lobbies) {
  if (lobbies !== undefined && lobbies !== null) {
    const list = [...lobbies];
    list.sort((a, b) => a.lobby_name.localeCompare(b.lobby_name));
    return list;
  }
  return [];
}

function getNicknameColor(id, name) {
  const hashString = id && id !== '00000000000000000000000000000000' ? id : (name || '');
  let hash = 0;
  for (let i = 0; i < hashString.length; i++) {
    hash = hashString.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 75%, 35%)`;
}

function getStatusColor(status) {
  switch (status) {
    case 1: return '#eab308'; // Yellow
    case 2: return '#22c55e'; // Green
    case 3: return '#ef4444'; // Red
    default: return '#94a3b8'; // Grey
  }
}

function getStatusTooltip(status) {
  switch (status) {
    case 1: return 'Tunnel is pending. Please wait...';
    case 2: return 'End-to-end encrypted conversation established. You can talk!';
    case 3: return 'Your partner closed the conversation.';
    default: return 'Remote status unknown.';
  }
}

// Chat messages travel as HTML. Stripping the tags is not enough: the entities
// they leave behind are still raw text and end up displayed verbatim, the most
// visible one being the &nbsp; that Qt emits for leading and repeated spaces.
// A textarea decodes them without ever parsing markup, since its content model
// is plain text and nothing in the string can become an element.
function decodeHtmlEntities(text) {
  const el = document.createElement('textarea');
  el.innerHTML = text;
  return el.value;
}

// Turn the HTML payload of a chat message into the text we display.
function htmlToText(text) {
  return decodeHtmlEntities(
    text
      .replaceAll('<br/>', '\n')
      .replaceAll('<br>', '\n')
      .replace(new RegExp('<style[^<]*</style>|<[^>]*>', 'gm'), '')
  );
}

function renderChatMessage(rawText) {
  if (!rawText) return '';

  // 1. Check for <img ... src="..."> HTML tags
  const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
  if (imgRegex.test(rawText)) {
    imgRegex.lastIndex = 0;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = imgRegex.exec(rawText)) !== null) {
      if (match.index > lastIndex) {
        const precedingText = rawText.substring(lastIndex, match.index);
        const cleanText = htmlToText(precedingText);
        if (cleanText) {
          parts.push(renderTextWithEmoji(cleanText));
        }
      }

      const src = match[1];
      if (src) {
        parts.push(
          m('img.chat-embedded-image', {
            src,
            style: {
              maxWidth: '100%',
              maxHeight: '300px',
              borderRadius: '0.375rem',
              marginTop: '0.25rem',
              marginBottom: '0.25rem',
              display: 'block',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            },
            onclick: () => {
              const w = window.open('');
              if (w) {
                w.document.write(`<body style="margin:0;background:#0f172a;display:flex;justify-content:center;align-items:center;min-height:100vh;"><img src="${src}" style="max-width:100%;max-height:100vh;object-fit:contain;"/></body>`);
              }
            }
          })
        );
      }

      lastIndex = imgRegex.lastIndex;
    }

    if (lastIndex < rawText.length) {
      const trailingText = rawText.substring(lastIndex);
      const cleanText = htmlToText(trailingText);
      if (cleanText) {
        parts.push(renderFormattedMessageText(cleanText));
      }
    }

    return parts.length > 0 ? parts : '';
  }

  // 2. Check for raw data:image/... base64 URLs
  if (rawText.trim().startsWith('data:image/')) {
    const src = rawText.trim();
    return m('img.chat-embedded-image', {
      src,
      style: {
        maxWidth: '100%',
        maxHeight: '300px',
        borderRadius: '0.375rem',
        marginTop: '0.25rem',
        marginBottom: '0.25rem',
        display: 'block',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      },
      onclick: () => {
        const w = window.open('');
        if (w) {
          w.document.write(`<body style="margin:0;background:#0f172a;display:flex;justify-content:center;align-items:center;min-height:100vh;"><img src="${src}" style="max-width:100%;max-height:100vh;object-fit:contain;"/></body>`);
        }
      }
    });
  }

  // 3. Normal text message
  const cleanText = htmlToText(
    rawText
      .replace(/<blockquote[^>]*>/gi, '\n> ')
      .replace(/<\/blockquote>/gi, '\n')
  );

  return renderFormattedMessageText(cleanText);
}

function renderFormattedMessageText(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const elements = [];
  let currentQuoteLines = [];

  const flushQuote = () => {
    if (currentQuoteLines.length > 0) {
      const quoteText = currentQuoteLines.join('\n');
      elements.push(
        m('blockquote.chat-quote-block', {
          style: {
            borderLeft: '3px solid #3b82f6',
            backgroundColor: '#f8fafc',
            color: '#475569',
            padding: '0.35rem 0.65rem',
            margin: '0.35rem 0',
            borderRadius: '0 0.375rem 0.375rem 0',
            fontSize: '0.9em',
            fontStyle: 'italic',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }
        }, renderTextWithEmoji(quoteText))
      );
      currentQuoteLines = [];
    }
  };

  lines.forEach((line, idx) => {
    if (line.trim().startsWith('>')) {
      const lineContent = line.trim().replace(/^>\s?/, '');
      currentQuoteLines.push(lineContent);
    } else {
      flushQuote();
      if (line) {
        elements.push(renderTextWithEmoji(line));
      }
      if (idx < lines.length - 1) {
        elements.push(m('br'));
      }
    }
  });
  flushQuote();

  return elements.length > 0 ? elements : renderTextWithEmoji(text);
}

/**
 * Wraps emoji characters in a span so CSS can size them independently.
 */
function renderTextWithEmoji(text) {
  if (!text) return '';
  const emojiRegex = /(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:[\u{1F3FB}-\u{1F3FF}])?(?:\u{FE0F})?(?:\u{20E3})?(?:(?:\u{200D}(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:[\u{1F3FB}-\u{1F3FF}])?(?:\u{FE0F})?)*)/gu;
  const parts = [];
  let last = 0;
  let match;

  while ((match = emojiRegex.exec(text)) !== null) {
    if (match[0].length === 0) { emojiRegex.lastIndex++; continue; }
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(m('span.chat-emoji', match[0]));
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

function getSafeAvatar(details) {
  if (
    details &&
    details.mAvatar &&
    details.mAvatar.mData &&
    details.mAvatar.mData.base64 !== ''
  ) {
    return details.mAvatar;
  }
  return undefined;
}

// ***************************** models ***********************************

const MobileState = {
  showLobbies: false,
  showUsers: false,
  toggleLobbies() {
    this.showLobbies = !this.showLobbies;
    this.showUsers = false;
  },
  toggleUsers() {
    this.showUsers = !this.showUsers;
    this.showLobbies = false;
  },
  closeAll() {
    this.showLobbies = false;
    this.showUsers = false;
  },
};

const ChatRoomsModel = {
  allRooms: [],
  knownSubscrIds: [],
  subscribedRooms: {},
  loadPublicRooms() {
    rs.rsJsonApiRequest(
      '/rsChats/getListOfNearbyChatLobbies',
      {},
      (data) => {
        if (data && data.public_lobbies) {
          const seen = new Set();
          const uniqueLobbies = data.public_lobbies.filter((lobby) => {
            const id = rs.idToHex(lobby.lobby_id);
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
          ChatRoomsModel.allRooms = sortLobbies(uniqueLobbies);
        } else {
          ChatRoomsModel.allRooms = [];
        }
      }
    );
  },
  loadSubscribedRooms(after = null) {
    rs.rsJsonApiRequest(
      '/rsChats/getChatLobbyList',
      {},
      (data) => {
        if (data && data.cl_list) {
          const ids = [...new Set(data.cl_list.map((lid) => rs.idToHex(lid)))];
          ChatRoomsModel.knownSubscrIds = ids;

          Object.keys(ChatRoomsModel.subscribedRooms).forEach((id) => {
            if (!ids.includes(id)) {
              delete ChatRoomsModel.subscribedRooms[id];
            }
          });

          if (ids.length === 0) {
            ChatRoomsModel.loadPublicRooms();
            if (after != null) after();
            m.redraw();
            return;
          }

          let count = 0;
          ids.forEach((id) =>
            loadLobbyDetails(id, (info) => {
              if (info) {
                ChatRoomsModel.subscribedRooms[id] = info;
              }
              count++;
              if (count === ids.length) {
                ChatRoomsModel.loadPublicRooms();
                if (after != null) {
                  after();
                }
                m.redraw();
              }
            })
          );
        } else {
          ChatRoomsModel.loadPublicRooms();
        }
      }
    );
  },
  subscribed(info) {
    return this.knownSubscrIds.includes(rs.idToHex(info.lobby_id));
  },
};

/**
 * Message displays a single Chat-Message
 * currently removes formatting and in consequence inline links
 */
const Message = () => {
  return {
    view: (vnode) => {
      const msg = vnode.attrs;
      const datetime = new Date(msg.sendTime * 1000).toLocaleTimeString();
      if (msg.isSystem) {
        const text = msg.msg || msg.message;
        const isSecured = text.includes('secured') || text.includes('talk');
        const bgColor = isSecured ? '#fffbeb' : '#f8fafc';
        const borderColor = isSecured ? '#fcd34d' : '#cbd5e1';
        const textColor = isSecured ? '#b45309' : '#475569';
        const borderStyle = isSecured ? 'solid' : 'dashed';

        return m(
          '.message.incoming',
          [
            m('span.datetime', datetime),
            m('span.username', 'Chat status'),
            m('.messagetext', {
              style: {
                backgroundColor: bgColor,
                border: `1px ${borderStyle} ${borderColor}`,
                color: textColor,
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                display: 'inline-block',
                marginTop: '0.25rem',
              }
            }, text)
          ]
        );
      }
      const rawGxsId = msg.lobby_peer_gxs_id || msg.peerId;
      let gxsId = rs.idToHex(rawGxsId);

      const isZero = (id) => !id || id === '00000000000000000000000000000000';
      if (isZero(gxsId)) {
        const lobby = ChatLobbyModel.currentLobby;
        if (lobby && (lobby.chatType === 1 || lobby.chatType === 2)) {
          gxsId = msg.incoming ? rs.idToHex(lobby.to_id || lobby.peer_id || lobby.distant_chat_id) : rs.idToHex(lobby.own_id || lobby.gxs_id);
        }
      }

      const isMuted = ChatHubState.mutedUsers && ChatHubState.mutedUsers.has(gxsId);
      const details = ChatHubState.gxsDetails[gxsId];
      const opinion = details && details.mReputation ? details.mReputation.mOwnOpinion : 1;
      const isBanned = opinion === 0;

      if (isMuted || isBanned) {
        return null;
      }

      let username = rs.userList.username(gxsId) || msg.peerName || '???';
      if (username === gxsId && msg.peerName) {
        username = msg.peerName;
      }
      if (username === gxsId && gxsId && gxsId.length > 12) {
        username = gxsId.substring(0, 8) + '...';
      }
      const rawText = msg.msg || msg.message || '';

      const chatType = ChatLobbyModel.currentLobby && ChatLobbyModel.currentLobby.chatType;
      const isRoom = chatType === 3;

      const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sel = window.getSelection() ? window.getSelection().toString() : '';
        const targetText = sel && sel.trim() ? sel : rawText;

        ChatHubState.messageContextMenu = {
          show: true,
          x: e.clientX,
          y: e.clientY,
          messageText: targetText,
          username,
          gxsId,
        };
        m.redraw();
      };

      if (isRoom) {
        const nickColor = getNicknameColor(gxsId, username);
        return m(
          '.message.compact',
          {
            oncontextmenu: handleContextMenu,
          },
          [
            m('span.datetime', datetime),
            m('span.username', { style: { color: nickColor } }, username + ':'),
            m('span.messagetext', renderChatMessage(rawText)),
          ]
        );
      }

      return m(
        '.message' + (msg.incoming ? '.incoming' : '.outgoing'),
        m('span.datetime', datetime),
        m('span.username', username),
        m('span.messagetext', renderChatMessage(rawText))
      );
    },
  };
};

const ChatLobbyModel = {
  currentLobby: {
    lobby_name: '...',
  },
  lobby_user: '...',
  isSubscribed: false,
  messages: [],
  users: [],
  messageKeys: new Set(),
  lastLobbyId: null,
  distantChatStatus: null,
  statusPollInterval: null,

  pollDistantChatStatus() {
    if (!this.currentLobby || this.currentLobby.chatType !== 2) return;
    rs.rsJsonApiRequest(
      '/rsChats/getDistantChatStatus',
      {
        pid: this.currentLobby.lobby_id,
      },
      (detail, success) => {
        if (success && detail.retval) {
          const oldStatus = this.distantChatStatus ? this.distantChatStatus.status : null;
          this.distantChatStatus = detail.info;

          if (oldStatus !== null && oldStatus !== detail.info.status) {
            if (detail.info.status === 2) {
              this.addMessages([{
                chat_id: this.chatId(),
                isSystem: true,
                msg: 'Tunnel is secured. You can talk!',
                sendTime: Math.floor(Date.now() / 1000)
              }]);
            } else if (detail.info.status === 3) {
              this.addMessages([{
                chat_id: this.chatId(),
                isSystem: true,
                msg: 'Your partner closed the conversation.',
                sendTime: Math.floor(Date.now() / 1000)
              }]);
            }
          }
          m.redraw();
        }
      }
    );
  },

  startStatusPolling() {
    this.stopStatusPolling();
    this.pollDistantChatStatus();
    this.statusPollInterval = setInterval(() => this.pollDistantChatStatus(), 3000);
  },

  stopStatusPolling() {
    if (this.statusPollInterval) {
      clearInterval(this.statusPollInterval);
      this.statusPollInterval = null;
    }
    this.distantChatStatus = null;
  },

  getMessageKey(msg) {
    if (msg.msgId && msg.msgId !== 0) return 'id_' + msg.msgId;
    const text = msg.msg || msg.message || '';
    return 't_' + msg.sendTime + '_' + text.substring(0, 32);
  },

  addMessages(newMsgs, scroll = false) {
    let added = false;
    newMsgs.forEach((msg) => {
      const key = this.getMessageKey(msg);
      if (!this.messageKeys.has(key)) {
        const text = msg.msg || msg.message || '';
        const isNearDuplicate = this.messages.some((existingMsg) => {
          const eAttrs = existingMsg.attrs;
          const eText = eAttrs.msg || eAttrs.message || '';
          return (
            eText === text &&
            Math.abs(eAttrs.sendTime - msg.sendTime) < 5
          );
        });

        if (!isNearDuplicate) {
          this.messageKeys.add(key);
          this.messages.push(m(Message, msg));
          added = true;
        }
      }
    });

    if (added) {
      this.messages.sort((a, b) => a.attrs.sendTime - b.attrs.sendTime);
      m.redraw();
      if (scroll) {
        setTimeout(() => {
          const element = document.querySelector('.messages');
          if (element) {
            element.scrollTop = element.scrollHeight;
          }
        }, 100);
      }
    }
  },

  loadHistory(id, type) {
    const chatPeerId = {
      broadcast_status_peer_id: '00000000000000000000000000000000',
      type,
      peer_id: '00000000000000000000000000000000',
      distant_chat_id: '00000000000000000000000000000000',
      lobby_id: { xstr64: '0' },
    };

    if (type === 3) chatPeerId.lobby_id.xstr64 = id;
    else if (type === 2) chatPeerId.distant_chat_id = id;
    else if (type === 1) chatPeerId.peer_id = id;

    rs.rsJsonApiRequest(
      '/rsHistory/getMessages',
      {
        chatPeerId,
        loadCount: 20,
      },
      (data, success) => {
        if (success && data.msgs) {
          this.addMessages(data.msgs);
        }
      }
    );
  },
  loadAllHistoryForRoom(lobbyId, callback) {
    ChatHubState.isHistoryLoading = true;
    ChatHubState.fullHistoryMessages = [];
    m.redraw();

    const chatType = this.currentLobby && this.currentLobby.chatType;
    const isDistant = chatType === 2;

    const chatPeerId = {
      broadcast_status_peer_id: '00000000000000000000000000000000',
      type: isDistant ? 2 : 3,
      peer_id: '00000000000000000000000000000000',
      distant_chat_id: isDistant ? (lobbyId || '') : '00000000000000000000000000000000',
      lobby_id: { xstr64: isDistant ? '0' : (lobbyId || '0') },
    };

    rs.rsJsonApiRequest(
      '/rsHistory/getMessages',
      {
        chatPeerId,
        loadCount: 0,
      },
      (data, success) => {
        const msgs = (success && data && data.msgs) ? data.msgs : [];
        msgs.sort((a, b) => (a.sendTime || a.recvTime) - (b.sendTime || b.recvTime));
        ChatHubState.fullHistoryMessages = msgs;
        ChatHubState.isHistoryLoading = false;
        m.redraw();
        if (callback) callback();
      }
    );
  },
  setupAction: (lobbyId, nick) => { },
  setIdentity(lobbyId, nick) {
    rs.rsJsonApiRequest(
      '/rsChats/setIdentityForChatLobby',
      {
        lobby_id: { xstr64: lobbyId },
        nick,
      },
      () => m.route.set('/chat/:lobby', { lobby: lobbyId }),
      true
    );
  },
  enterPublicLobby(lobbyId, nick) {
    rs.rsJsonApiRequest(
      '/rsChats/joinVisibleChatLobby',
      {
        lobby_id: { xstr64: lobbyId },
        own_id: nick,
      },
      () => {
        loadLobbyDetails(lobbyId, (info) => {
          ChatRoomsModel.subscribedRooms[lobbyId] = info;
          ChatRoomsModel.loadSubscribedRooms(() => {
            m.route.set('/chat/:lobby', { lobby: rs.idToHex(info.lobby_id) });
          });
        });
      },
      true
    );
  },
  unsubscribeChatLobby(lobbyId, follow) {
    rs.rsJsonApiRequest(
      '/rsChats/unsubscribeChatLobby',
      {
        lobby_id: { xstr64: lobbyId },
      },
      (data, success) => {
        if (success) {
          ChatRoomsModel.loadSubscribedRooms(follow);
        }
      },
      true
    );
  },
  chatId() {
    const type = (this.currentLobby && this.currentLobby.chatType) || 3;
    const id = this.lastLobbyId || m.route.param('lobby');
    const cid = {
      broadcast_status_peer_id: '00000000000000000000000000000000',
      type,
      peer_id: '00000000000000000000000000000000',
      distant_chat_id: '00000000000000000000000000000000',
      lobby_id: { xstr64: '0' },
    };
    if (type === 3) cid.lobby_id.xstr64 = id;
    else if (type === 2) cid.distant_chat_id = id;
    else if (type === 1) cid.peer_id = id;
    return cid;
  },
  loadLobby(currentlobbyid) {
    this.stopStatusPolling();
    this.lastLobbyId = currentlobbyid;

    const finishLoad = (detail) => {
      this.setupAction = this.setIdentity;
      this.currentLobby = detail;
      this.isSubscribed = true;
      this.lobby_user = rs.userList.username(detail.gxs_id) || '???';

      this.messages = [];
      this.messageKeys.clear();

      this.loadHistory(currentlobbyid, detail.chatType);

      const cid = this.chatId();
      rs.events[15].chatMessages(cid, rs.events[15], (l) => {
        this.addMessages(l);
      });

      rs.events[15].notify = (chatMessage) => {
        const msgCid = chatMessage.chat_id;
        let msgId;

        if (msgCid.type === 3) {
          msgId = rs.idToHex(msgCid.lobby_id);
        } else if (msgCid.type === 2) {
          msgId = rs.idToHex(msgCid.distant_chat_id);
        } else if (msgCid.type === 1) {
          msgId = rs.idToHex(msgCid.peer_id);
        } else {
          msgId = rs.idToHex(msgCid);
        }

        if (msgId === currentlobbyid) {
          this.addMessages([chatMessage]);
        }
      };

      let list = [];
      if (detail.gxs_ids) {
        if (Array.isArray(detail.gxs_ids)) {
          list = detail.gxs_ids.map((u) => {
            const key = u.key;
            return { key, name: rs.userList.username(key) || key, lastAct: get64Num(u.value) };
          });
        } else if (typeof detail.gxs_ids === 'object') {
          list = Object.keys(detail.gxs_ids).map((key) => {
            return { key, name: rs.userList.username(key) || key, lastAct: get64Num(detail.gxs_ids[key]) };
          });
        }
      }

      const ownId = detail.gxs_id;
      if (ownId && ownId !== '00000000000000000000000000000000') {
        const hasOwn = list.some((u) => u.key === ownId);
        if (!hasOwn) {
          list.push({
            key: ownId,
            name: rs.userList.username(ownId) || ownId,
            lastAct: Math.floor(Date.now() / 1000)
          });
        }
      }

      if (list.length === 0) {
        list = [{ key: ownId || '', name: rs.userList.username(ownId) || detail.lobby_name || '???', lastAct: Math.floor(Date.now() / 1000) }];
      }

      list.sort((a, b) => a.name.localeCompare(b.name));
      this.users = list;

      if (detail.chatType === 2) {
        this.startStatusPolling();
      }

      m.redraw();
    };

    loadLobbyDetails(currentlobbyid, (detail) => {
      if (detail) {
        finishLoad(detail);
      } else {
        loadDistantChatDetails(currentlobbyid, (dDetail) => {
          if (dDetail) {
            finishLoad(dDetail);
          }
        });
      }
    });
  },
  loadPublicLobby(currentlobbyid) {
    this.setupAction = this.enterPublicLobby;
    this.isSubscribed = false;
    ChatRoomsModel.allRooms.forEach((it) => {
      if (rs.idToHex(it.lobby_id) === currentlobbyid) {
        this.currentLobby = it;
        this.lobby_user = '???';
        this.lobbyid = currentlobbyid;
      }
    });
    this.users = [];
  },
  sendMessage(msg, onsuccess) {
    const cid = this.chatId();

    rs.rsJsonApiRequest(
      '/rsChats/sendChat',
      {
        id: cid,
        msg,
      },
      (data, success) => {
        if (success) {
          const echoMsg = {
            chat_id: cid,
            msg,
            sendTime: Math.floor(Date.now() / 1000),
            lobby_peer_gxs_id: this.currentLobby.gxs_id,
          };
          this.addMessages([echoMsg], true);
          if (onsuccess) onsuccess();
        } else {
          console.error('[RS] Failed to send chat message:', data);
          alert('Failed to send chat message. The image/payload exceeds RetroShare max chat packet size.');
          if (onsuccess) onsuccess();
        }
      }
    );
  },
  selected(info, selName, defaultName) {
    const currid = rs.idToHex(ChatLobbyModel.currentLobby.lobby_id || { xstr64: m.route.param('lobby') });
    return (rs.idToHex(info.lobby_id) === currid ? selName : '') + defaultName;
  },
  switchToEvent(info) {
    return () => {
      ChatLobbyModel.currentLobby = info;
      m.route.set('/chat/:lobby', { lobby: rs.idToHex(info.lobby_id) });
      ChatLobbyModel.loadLobby(rs.idToHex(info.lobby_id));
    };
  },
  setupEvent(info) {
    return () => {
      m.route.set('/chat/:lobby/setup', { lobby: rs.idToHex(info.lobby_id) });
      ChatLobbyModel.loadPublicLobby(rs.idToHex(info.lobby_id));
    };
  },
};

// ************************* Chat Hub State ****************************

const ChatHubState = {
  selectedRoomId: null,
  selectedRoom: null,
  selectedRoomType: null,
  searchString: '',
  ownProfile: { name: 'Loading...' },
  gxsDetails: {},
  hoveredUser: null,
  mutedUsers: new Set(),
  activeMenu: null,
  showAttachModal: false,
  attachPath: '',
  attachBrowseHint: false,
  isHashing: false,
  hashingError: '',
  showEmojiPicker: false,
  emojiSearch: '',
  emojiCategory: 'Smileys',
  showCreateRoomModal: false,
  newRoomName: '',
  newRoomTopic: '',
  newRoomIdentity: '',
  newRoomPublic: true,
  newRoomSigned: false,
  ownGxsIdentities: [],
  createRoomError: '',
  userSortMethod: 'name',
  showInviteModal: false,
  friendsList: [],
  selectedFriendsToInvite: new Set(),
  showHistoryModal: false,
  historySearchQuery: '',
  fullHistoryMessages: [],
  isHistoryLoading: false,
  messageContextMenu: {
    show: false,
    x: 0,
    y: 0,
    messageText: '',
    username: '',
    gxsId: '',
  },
};

module.exports = {
  get64Num,
  loadLobbyDetails,
  loadDistantChatDetails,
  sortLobbies,
  getNicknameColor,
  getStatusColor,
  getStatusTooltip,
  renderTextWithEmoji,
  renderChatMessage,
  getSafeAvatar,
  MobileState,
  ChatRoomsModel,
  Message,
  ChatLobbyModel,
  ChatHubState,
};
 
}); 
require.register("config/config_chat", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const peopleUtil = require('people/people_util');
const peopleState = require('people/people_state');

const ConfigChat = () => {
  let defaultIdentity = '';
  let ownIdentities = [];
  let acceptChatFrom = 0; // 0 = Everyone, 1 = Contacts Only, 2 = Nobody
  let maxStorageDays = 10;

  // History states
  const historyEnable = { private: true, distant: true, lobby: true };
  const historySaveCount = { private: 500, distant: 500, lobby: 500 };

  function loadSettings() {
    // Load Own Identities
    peopleUtil.ownIds((ids) => {
      ownIdentities = ids || [];
      ownIdentities.forEach((id) => {
        peopleState.fetchIdDetails(id);
      });
      m.redraw();
    });

    // Load Default Lobby Identity
    rs.rsJsonApiRequest('/rsChats/getDefaultIdentityForChatLobby', {}, (data) => {
      if (data && data.id) {
        defaultIdentity = data.id;
        peopleState.fetchIdDetails(defaultIdentity);
        m.redraw();
      }
    });

    // Load Distant Chat Accept Permission Flags (silent error fallback)
    rs.rsJsonApiRequest('/rsChats/getDistantChatPermissionFlags', {}, (data, success) => {
      if (success && data && data.retval !== undefined) {
        acceptChatFrom = data.retval;
        m.redraw();
      }
    }, true);

    // Load Max Storage Duration (silent error fallback)
    rs.rsJsonApiRequest('/rsHistory/getMaxStorageDuration', {}, (data, success) => {
      if (success && data && data.retval !== undefined) {
        maxStorageDays = Math.round(data.retval / 86400);
        m.redraw();
      }
    }, true);

    // Load History Enables & Save Counts
    const types = [
      { key: 'private', type: 1 },
      { key: 'distant', type: 3 },
      { key: 'lobby', type: 2 },
    ];

    types.forEach(({ key, type }) => {
      rs.rsJsonApiRequest('/rsHistory/getEnable', { chat_type: type }, (data, success) => {
        if (success && data && data.retval !== undefined) {
          historyEnable[key] = data.retval;
          m.redraw();
        }
      }, true);
      rs.rsJsonApiRequest('/rsHistory/getSaveCount', { chat_type: type }, (data, success) => {
        if (success && data && data.retval !== undefined) {
          historySaveCount[key] = data.retval;
          m.redraw();
        }
      }, true);
    });
  }

  return {
    oninit: () => {
      loadSettings();
    },
    view: () => {
      const selectedDetails = defaultIdentity ? peopleState.State.gxsIdToDetailsMap[defaultIdentity] : null;

      return m('.node-config', [
        // General Chat Settings
        m('.widget', [
          m('.widget__heading', m('h3', 'General Chat Settings')),
          m('.widget__body', [
            m('.config-grid', { style: 'display: grid; grid-template-columns: 200px 1fr; gap: 1rem; align-items: center;' }, [
              m('label', { style: 'font-weight: 500; color: #334155;' }, 'Default identity for chat rooms:'),
              m('.default-id-selector', { style: 'display: flex; align-items: center; gap: 0.5rem;' }, [
                m(peopleUtil.UserAvatar, {
                  avatar: selectedDetails ? selectedDetails.mAvatar : null,
                  identityId: defaultIdentity,
                  size: 24,
                }),
                m('select', {
                  style: 'padding: 0.35rem 0.6rem; border-radius: 0.375rem; border: 1px solid #cbd5e1; outline: none; background: #ffffff; min-width: 240px; font-weight: 600;',
                  value: defaultIdentity,
                  onchange: (e) => {
                    defaultIdentity = e.target.value;
                    rs.rsJsonApiRequest('/rsChats/setDefaultIdentityForChatLobby', { id: defaultIdentity }, () => {});
                  },
                }, [
                  m('option', { value: '' }, '-- Select Default Identity --'),
                  ownIdentities.map((id) => {
                    const det = peopleState.State.gxsIdToDetailsMap[id];
                    const nick = (det ? det.mNickname : null) || rs.userList.username(id) || id;
                    return m('option', { value: id }, nick);
                  }),
                ]),
              ]),

              m('label', { style: 'font-weight: 500; color: #334155;' }, 'Accept chat from:'),
              m('select', {
                style: 'padding: 0.35rem 0.6rem; border-radius: 0.375rem; border: 1px solid #cbd5e1; outline: none; background: #ffffff; max-width: 320px; font-weight: 600;',
                value: acceptChatFrom,
                onchange: (e) => {
                  acceptChatFrom = parseInt(e.target.value);
                  rs.rsJsonApiRequest('/rsChats/setDistantChatPermissionFlags', { flags: acceptChatFrom }, () => {}, true);
                },
              }, [
                m('option', { value: 0 }, 'Everyone'),
                m('option', { value: 1 }, 'Contacts Only'),
                m('option', { value: 2 }, 'Nobody'),
              ]),
            ]),
          ]),
        ]),

        // Chat History Settings
        m('.widget', [
          m('.widget__heading', m('h3', 'Chat History Settings')),
          m('.widget__body', [
            m('.config-grid', { style: 'display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 0.75rem 1rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; margin-bottom: 1.25rem; max-width: 500px; width: 100%;' }, [
              m('div', [
                m('span', { style: 'font-weight: 600; color: #1e293b; display: block;' }, 'Max Storage Duration'),
                m('span', { style: 'font-size: 0.8rem; color: #64748b;' }, 'Global expiration period for messages stored in history database'),
              ]),
              m('.storage-input-group', { style: 'display: flex; align-items: center; gap: 0.5rem;' }, [
                m('input[type=number][min=1][max=365]', {
                  style: 'width: 70px; padding: 0.35rem 0.5rem; border-radius: 0.375rem; border: 1px solid #cbd5e1; outline: none; font-weight: 600; text-align: center;',
                  value: maxStorageDays,
                  oninput: (e) => (maxStorageDays = parseInt(e.target.value) || 1),
                  onchange: () => {
                    rs.rsJsonApiRequest('/rsHistory/setMaxStorageDuration', { seconds: maxStorageDays * 86400 }, () => {}, true);
                  },
                }),
                m('span', { style: 'font-weight: 500; color: #475569; font-size: 0.85rem;' }, 'Days'),
              ]),
            ]),

            m('.table-container', { style: 'border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; background: #ffffff; max-width: 500px; width: 100%;' }, [
              m('table.history-config-table', { style: 'width: 100%; border-collapse: collapse; text-align: left;' }, [
                m('thead', [
                  m('tr', { style: 'background: #f8fafc; border-bottom: 1px solid #e2e8f0;' }, [
                    m('th', { style: 'padding: 0.75rem 0.75rem; color: #475569; font-weight: 600; font-size: 0.85rem; width: 220px; text-align: left;' }, 'Chat Type'),
                    m('th', { style: 'padding: 0.75rem 0.75rem; color: #475569; font-weight: 600; font-size: 0.85rem; width: 120px; text-align: center;' }, 'Enable History'),
                    m('th', { style: 'padding: 0.75rem 0.75rem; color: #475569; font-weight: 600; font-size: 0.85rem; width: 160px; text-align: center;' }, 'Max Saved Messages'),
                  ]),
                ]),
                m('tbody', [
                  [
                    { label: 'Direct Chat (Private)', icon: 'fa-user-lock', key: 'private', type: 1 },
                    { label: 'Distant Chat', icon: 'fa-network-wired', key: 'distant', type: 3 },
                    { label: 'Chat Rooms (Lobbies)', icon: 'fa-comments', key: 'lobby', type: 2 },
                  ].map(({ label, icon, key, type }) =>
                    m('tr', { style: 'border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;' }, [
                      m('td', { style: 'padding: 0.75rem 0.75rem; font-weight: 600; color: #1e293b; text-align: left;' }, [
                        m('i.fas.' + icon, { style: 'margin-right: 0.5rem; color: #64748b; font-size: 0.9rem;' }),
                        label,
                      ]),
                      m('td', { style: 'padding: 0.75rem 0.75rem; text-align: center;' }, [
                        m('input[type=checkbox]', {
                          style: 'width: 17px; height: 17px; cursor: pointer; accent-color: #3b82f6;',
                          checked: historyEnable[key],
                          oninput: (e) => {
                            historyEnable[key] = e.target.checked;
                            rs.rsJsonApiRequest('/rsHistory/setEnable', { chat_type: type, enable: historyEnable[key] }, () => {}, true);
                          },
                        }),
                      ]),
                      m('td', { style: 'padding: 0.75rem 0.75rem; text-align: center;' }, [
                        m('div', { style: 'display: flex; align-items: center; justify-content: center; gap: 0.4rem;' }, [
                          m('input[type=number][min=0][max=50000]', {
                            style: 'width: 80px; padding: 0.3rem 0.4rem; border-radius: 0.375rem; border: 1px solid #cbd5e1; outline: none; text-align: center; font-weight: 500;',
                            value: historySaveCount[key],
                            oninput: (e) => (historySaveCount[key] = parseInt(e.target.value) || 0),
                            onchange: () => {
                              rs.rsJsonApiRequest('/rsHistory/setSaveCount', { chat_type: type, count: historySaveCount[key] }, () => {}, true);
                            },
                          }),
                          m('span', { style: 'font-size: 0.8rem; color: #94a3b8;' }, 'msgs'),
                        ]),
                      ]),
                    ])
                  ),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]);
    },
  };
};

module.exports = ConfigChat;
 
}); 
require.register("config/config_files", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const util = require('config/config_util');

const SharedDirectories = () => {
  let directories = [];
  return {
    oninit: () => {
      rs.rsJsonApiRequest('/rsFiles/getSharedDirectories', {}, (data) => (directories = data.dirs));
    },
    view: () =>
      m('.widget__body-box', [
        m('.widget__heading', m('h3', 'Shared Directories')),
        directories.map((dir) =>
          m('input[type=text].stretched', {
            value: dir.filename,
          })
        ),
      ]),
  };
};

const DownloadDirectory = () => {
  let dlDir = '';
  const setDir = () => {
    rs.rsJsonApiRequest('/rsFiles/setDownloadDirectory', {
      path: dlDir,
    });
  };
  return {
    oninit: () => {
      rs.rsJsonApiRequest('/rsFiles/getDownloadDirectory', {}, (data) => (dlDir = data.retval));
    },
    view: () =>
      m('.widget__body-box', [
        m('.widget__heading', m('h3', 'Downloads Directory')),
        m('input[type=text].stretched#dl-dir-input', {
          oninput: (e) => (dlDir = e.target.value),
          value: dlDir,
          onchange: setDir,
        }),
      ]),
  };
};

const PartialsDirectory = () => {
  let partialsDir = '';
  const setDir = () => {
    // const path = document.getElementById('partial-dir-input').value; // unused?

    rs.rsJsonApiRequest('/rsFiles/setPartialsDirectory', {
      path: partialsDir,
    });
  };
  return {
    oninit: () =>
      rs.rsJsonApiRequest(
        '/rsFiles/getPartialsDirectory',
        {},
        (data) => (partialsDir = data.retval)
      ),
    view: () =>
      m('.widget__body-box', [
        m('.widget__heading', m('h3', 'Partials Directory')),
        m('input[type=text].stretched#partial-dir-input', {
          oninput: (e) => (partialsDir = e.target.value),
          value: partialsDir,
          onchange: setDir,
        }),
      ]),
  };
};

const TransferOptions = () => {
  let queueSize = undefined;
  let maxUploadSlots = undefined;
  let strategy = undefined;
  let diskLimit = undefined;
  let directDLPerm = undefined;
  const setMaxSimultaneousDownloads = () =>
    rs.rsJsonApiRequest('/rsFiles/setQueueSize', {
      s: parseInt(queueSize),
    });
  const setMaxUploadSlots = () =>
    rs.rsJsonApiRequest('/rsFiles/setMaxUploadSlotsPerFriend', {
      n: parseInt(maxUploadSlots),
    });
  const setChunkStrat = () =>
    rs.rsJsonApiRequest('/rsFiles/setDefaultChunkStrategy', {
      strategy: parseInt(strategy),
    });
  const setFreeLimit = () =>
    rs.rsJsonApiRequest('/rsFiles/setFreeDiskSpaceLimit', {
      minimumFreeMB: parseInt(diskLimit),
    });
  const setDirectDLPerm = () => {
    rs.rsJsonApiRequest('/rsFiles/setFilePermDirectDL', {
      perm: parseInt(directDLPerm),
    });
  };
  return {
    oninit: () => {
      rs.rsJsonApiRequest('/rsFiles/getQueueSize').then((res) => (queueSize = res.body.retval));
      rs.rsJsonApiRequest('/rsFiles/defaultChunkStrategy', {}, (data) => (strategy = data.retval));
      rs.rsJsonApiRequest('/rsFiles/getMaxUploadSlotsPerFriend').then(
        (res) => (maxUploadSlots = res.body.retval)
      );
      rs.rsJsonApiRequest('/rsFiles/freeDiskSpaceLimit', {}, (data) => (diskLimit = data.retval));
      rs.rsJsonApiRequest('/rsFiles/filePermDirectDL').then(
        (res) => (directDLPerm = res.body.retval)
      );
    },
    view: () =>
      m('.widget__body-box', [
        m('.widget__heading', m('h3', 'Transfer options')),
        m('.grid-2col', [
          m('p', 'Maximum simultaneous downloads:'),
          m('input[type=number]', {
            value: queueSize,
            oninput: (e) => (queueSize = e.target.value),
            onchange: setMaxSimultaneousDownloads,
          }),
          m('p', 'Default chunk strategy:'),
          m(
            'select[name=strategy]',
            {
              value: strategy,
              oninput: (e) => (strategy = e.target.value),
              onchange: setChunkStrat,
            },
            ['Streaming', 'Random', 'Progressive'].map((val, i) =>
              m('option[value=' + i + ']', val)
            )
          ),
          m('p', 'Maximum uploads per friend:'),
          m('input[type=number]', {
            value: maxUploadSlots,
            oninput: (e) => (maxUploadSlots = e.target.value),
            onchange: setMaxUploadSlots,
          }),
          m('p', 'Safety disk space limit(MB):'),
          m('input[type=number]', {
            value: diskLimit,
            oninput: (e) => (diskLimit = e.target.value),
            onchange: setFreeLimit,
          }),
          m('p', 'Allow Direct Download:'),
          m(
            'select',
            {
              value: directDLPerm,
              oninput: (e) => (directDLPerm = e.target.value),
              onchange: setDirectDLPerm,
            },
            [
              m(
                'option',
                {
                  value: util.RS_FILE_PERM_DIRECT_DL_YES,
                },
                'Yes'
              ),
              m(
                'option',
                {
                  value: util.RS_FILE_PERM_DIRECT_DL_NO,
                },
                'No'
              ),
              m(
                'option',
                {
                  value: util.RS_FILE_PERM_DIRECT_DL_PER_USER,
                },
                'Per User'
              ),
            ]
          ),
        ]),
      ]),
  };
};

const Layout = () => {
  return {
    view: () =>
      m('.widget', [
        m('.widget__heading', m('h3', 'Files Configuration')),
        m('.widget__body.config-files', [
          m(SharedDirectories),
          m(DownloadDirectory),
          m(PartialsDirectory),
          m(TransferOptions),
        ]),
      ]),
  };
};

module.exports = Layout;
 
}); 
require.register("config/config_mail", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const widget = require('widgets');
const util = require('config/config_util');

const msgTagObj = {
  tagId: 100,
  tagName: '',
  tagColor: '',
};
let tagArr = [];

async function handleSubmit(tagId) {
  const modalContainer = document.getElementById('modal-container');
  msgTagObj.tagId = typeof tagId === 'number' ? tagId : util.getRandomId(tagArr);
  let tagNameAlreadyExists = false;
  tagArr.forEach((item) => {
    if (item.value.first === msgTagObj.tagName) tagNameAlreadyExists = true;
  });
  if (tagNameAlreadyExists) {
    alert('Tag Name Already Exists');
  } else {
    rs.rsJsonApiRequest('/rsMail/setMessageTagType', {
      tagId: msgTagObj.tagId,
      text: msgTagObj.tagName,
      rgb_color: parseInt(msgTagObj.tagColor.substring(1), 16),
    });
    modalContainer.style.display = 'none';
    rs.rsJsonApiRequest('/rsMail/getMessageTagTypes').then((res) => (tagArr = res.body.tags.types));
  }
}

const MessageTagForm = () => {
  return {
    view: (v) => {
      const isCreateForm = v.attrs.tagItem === undefined;
      return m(
        'form.mail-tags-form',
        {
          onsubmit: isCreateForm ? handleSubmit : () => handleSubmit(v.attrs.tagItem.key),
        },
        [
          m('h3', isCreateForm ? 'Create New Tag Type' : 'Edit Tag Type'),
          m('hr'),
          m('.input-field', [
            m('label[for=tagName]', 'Enter Tag Name'),
            m('input[type=text][id=tagName][placeholder="enter tag name"]', {
              value: msgTagObj.tagName,
              oninput: (e) => (msgTagObj.tagName = e.target.value),
            }),
          ]),
          m('.input-field', [
            m('label[for=tagColor]', 'Choose Tag Color'),
            m('input[type=color][id=tagColor]', {
              value: msgTagObj.tagColor,
              oninput: (e) => (msgTagObj.tagColor = e.target.value),
            }),
          ]),
          // v.attrs.tagItem !== undefined && m('p', v.attrs.tagItem.value.first),
          m('button[type=submit]', 'Submit'),
        ]
      );
    },
  };
};

const Mail = () => {
  let distantMessagingPermissionFlag = 0;
  return {
    oninit: () => {
      rs.rsJsonApiRequest('/rsMail/getMessageTagTypes').then(
        (res) => (tagArr = res.body.tags.types)
      );
      rs.rsJsonApiRequest('/rsMail/getDistantMessagingPermissionFlags').then(
        (res) => (distantMessagingPermissionFlag = res.body.retval)
      );
    },
    view: () =>
      m('.widget.mail', [
        m('.widget__heading', m('h3', 'Mail Configuration')),
        m('.widget__body', [
          m('.permission-flag', [
            m('p', 'Accept encrypted distant messages from: '),
            m(
              'select',
              {
                value: distantMessagingPermissionFlag,
                oninput: (e) => (distantMessagingPermissionFlag = e.target.value),
                onchange: () => {
                  rs.rsJsonApiRequest('/rsMail/setDistantMessagingPermissionFlags', {
                    flags: parseInt(distantMessagingPermissionFlag),
                  });
                },
              },
              [
                m(
                  'option',
                  {
                    value: util.RS_DISTANT_MESSAGING_PERMISSION_FLAG_FILTER_NONE,
                  },
                  'Everybody'
                ),
                m(
                  'option',
                  {
                    value: util.RS_DISTANT_MESSAGING_PERMISSION_FLAG_FILTER_NON_CONTACTS,
                  },
                  'Contacts'
                ),
                m(
                  'option',
                  {
                    value: util.RS_DISTANT_MESSAGING_PERMISSION_FLAG_FILTER_EVERYBODY,
                  },
                  'Nobody'
                ),
              ]
            ),
          ]),
          m('.widget__heading', [
            m('h3', 'Mail Tags'),
            m(
              'button',
              {
                onclick: () => {
                  // set form fields to default values
                  msgTagObj.tagName = '';
                  msgTagObj.tagColor = '';
                  widget.popupMessage(m(MessageTagForm));
                },
              },
              'Create New Tag'
            ),
          ]),
          m(
            '.mail-tags',
            tagArr.length === 0
              ? m('h4', 'No Message Tags')
              : m(
                  '.mail-tags__container',
                  tagArr.map((tag) =>
                    m('.tag-item', { key: tag.key }, [
                      m('.tag-item__color', {
                        style: {
                          backgroundColor: `#${tag.value.second.toString(16).padStart(6, '0')}`,
                        },
                      }),
                      m('p.tag-item__name', tag.value.first),
                      m('.tag-item__modify', [
                        m(
                          'button',
                          {
                            onclick: () => {
                              msgTagObj.tagName = tag.value.first;
                              msgTagObj.tagColor = `#${tag.value.second
                                .toString(16)
                                .padStart(6, '0')}`;
                              widget.popupMessage(m(MessageTagForm, { tagItem: tag }));
                            },
                          },
                          m('i.fas.fa-pen')
                        ),
                        m(
                          'button.red',
                          {
                            onclick: () => {
                              rs.rsJsonApiRequest('/rsMail/removeMessageTagType', {
                                tagId: tag.key,
                              }).then((res) => {
                                if (res.body.retval)
                                  tagArr = tagArr.filter((item) => item.key !== tag.key);
                              });
                            },
                          },
                          m('i.fas.fa-trash')
                        ),
                      ]),
                    ])
                  )
                )
          ),
        ]),
      ]),
  };
};

module.exports = Mail;
 
}); 
require.register("config/config_network", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');

const util = require('config/config_util');

const SetNwMode = () => {
  const networkModes = [
    'Public: DHT & Discovery',
    'Private: Discovery only',
    'Inverted: DHT only',
    'Dark Net: None',
  ];
  const hiddenModes = [
    'Discovery On (recommended)',
    'Discovery Off',
  ];

  let vsDisc = 0;
  let vsDht = 0;
  let selectedMode;
  let sslId = '';
  let details = {};

  const updateSelectedMode = (isHiddenMode) => {
    if (!details || details.vs_dht === undefined) return;
    if (isHiddenMode) {
      if (details.vs_disc === util.RS_VS_DISC_OFF) {
        selectedMode = hiddenModes[1];
      } else {
        selectedMode = hiddenModes[0];
      }
    } else {
      if (
        details.vs_dht === util.RS_VS_DHT_FULL &&
        details.vs_disc === util.RS_VS_DISC_FULL
      ) {
        selectedMode = networkModes[0];
      } else if (
        details.vs_dht === util.RS_VS_DHT_OFF &&
        details.vs_disc === util.RS_VS_DISC_FULL
      ) {
        selectedMode = networkModes[1];
      } else if (
        details.vs_dht === util.RS_VS_DHT_FULL &&
        details.vs_disc === util.RS_VS_DISC_OFF
      ) {
        selectedMode = networkModes[2];
      } else if (
        details.vs_dht === util.RS_VS_DHT_OFF &&
        details.vs_disc === util.RS_VS_DISC_OFF
      ) {
        selectedMode = networkModes[3];
      }
    }
  };

  return {
    oninit: (vnode) => {
      rs.rsJsonApiRequest('/rsAccounts/getCurrentAccountId').then((res) => {
        if (res.body.retval) {
          sslId = res.body.id;
          rs.rsJsonApiRequest('/rsPeers/getPeerDetails', {
            sslId,
          }).then((res) => {
            if (res.body.retval) {
              details = res.body.det;
              updateSelectedMode(vnode.attrs && vnode.attrs.isHiddenMode);
              m.redraw();
            }
          });
        }
      });
    },
    onupdate: (vnode) => {
      updateSelectedMode(vnode.attrs && vnode.attrs.isHiddenMode);
    },
    view: (vnode) => {
      const isHiddenMode = vnode.attrs && vnode.attrs.isHiddenMode;
      const hideLabel = vnode.attrs && vnode.attrs.hideLabel;
      const modes = isHiddenMode ? hiddenModes : networkModes;

      return [
        !hideLabel && m('p', isHiddenMode ? 'Discovery:' : 'Network mode:'),
        m(
          'select',
          {
            style: 'flex: 1; max-width: 320px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px;',
            value: selectedMode,
            onchange: (e) => {
              const idx = e.target.selectedIndex;
              selectedMode = modes[idx];
              if (isHiddenMode) {
                if (idx === 0) {
                  vsDisc = util.RS_VS_DISC_FULL;
                  vsDht = util.RS_VS_DHT_OFF;
                } else if (idx === 1) {
                  vsDisc = util.RS_VS_DISC_OFF;
                  vsDht = util.RS_VS_DHT_OFF;
                }
              } else {
                if (idx === 0) {
                  vsDisc = util.RS_VS_DISC_FULL;
                  vsDht = util.RS_VS_DHT_FULL;
                } else if (idx === 1) {
                  vsDisc = util.RS_VS_DISC_FULL;
                  vsDht = util.RS_VS_DHT_OFF;
                } else if (idx === 2) {
                  vsDisc = util.RS_VS_DISC_OFF;
                  vsDht = util.RS_VS_DHT_FULL;
                } else if (idx === 3) {
                  vsDisc = util.RS_VS_DISC_OFF;
                  vsDht = util.RS_VS_DHT_OFF;
                }
              }
              if (
                details &&
                (vsDht !== details.vs_dht || vsDisc !== details.vs_disc) &&
                sslId !== undefined
              ) {
                rs.rsJsonApiRequest('/rsPeers/setVisState', {
                  sslId,
                  vsDisc,
                  vsDht,
                });
              }
            },
          },
          [modes.map((o) => m('option', { value: o }, o))]
        ),
      ];
    },
  };
};

const SetLimits = () => {
  let dlim = undefined;
  let ulim = undefined;
  const setMaxRates = () =>
    rs.rsJsonApiRequest('/rsConfig/SetMaxDataRates', {
      downKb: dlim,
      upKb: ulim,
    });
  return {
    oninit: () =>
      rs.rsJsonApiRequest('/rsConfig/GetMaxDataRates', {}, (data) => {
        dlim = data.inKb;
        ulim = data.outKb;
      }),
    view: () => [
      m('.nw-config-row', { style: 'display: grid; grid-template-columns: 200px 1fr; gap: 1rem; align-items: center; margin-bottom: 0.75rem;' }, [
        m('p', { style: 'font-weight: 600; color: #475569;' }, [
          util.tooltip(
            'The download limit covers the whole application. ' +
              'However, in some situations, such as when transfering ' +
              'many files at once, the estimated bandwidth becomes ' +
              'unreliable and the total value reported by Retroshare ' +
              'might exceed that limit.'
          ),
          'Download limit(KB/s):'
        ]),
        m('input[type=number][name=download]', {
          style: 'padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px; max-width: 320px; width: 100%;',
          value: dlim,
          oninput: (e) => (dlim = Number(e.target.value)),
          onchange: setMaxRates,
        }),
      ]),
      m('.nw-config-row', { style: 'display: grid; grid-template-columns: 200px 1fr; gap: 1rem; align-items: center; margin-bottom: 0.75rem;' }, [
        m('p', { style: 'font-weight: 600; color: #475569;' }, [
          util.tooltip(
            'The upload limit covers the entire software. ' +
              'Too small an upload limit may eventually block ' +
              'low priority services(forums, channels). ' +
              'A minimum recommended value is 50KB/s.'
          ),
          'Upload limit(KB/s):'
        ]),
        m('input[type=number][name=upload]', {
          style: 'padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px; max-width: 320px; width: 100%;',
          value: ulim,
          oninput: (e) => (ulim = Number(e.target.value)),
          onchange: setMaxRates,
        }),
      ]),
    ],
  };
};

const SetOpMode = () => {
  let opmode = undefined;
  const setmode = () =>
    rs.rsJsonApiRequest('/rsconfig/SetOperatingMode', {
      opMode: Number(opmode),
    });
  return {
    oninit: () =>
      rs.rsJsonApiRequest('/rsConfig/getOperatingMode', {}, (data) => (opmode = data.retval)),
    view: () => [
      m('.nw-config-row', { style: 'display: grid; grid-template-columns: 200px 1fr; gap: 1rem; align-items: center; margin-bottom: 0.75rem;' }, [
        m('p', { style: 'font-weight: 600; color: #475569;' }, [
          'Operating mode: ',
          util.tooltip(
            `No Anon D/L: Switches off file forwarding\n
            Gaming Mode: 25% standard traffic and TODO: Reduced popups\n
            Low traffic: 10% standard traffic and TODO: pause all file transfers\n`
          )
        ]),
        m(
          'select',
          {
            style: 'padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px; max-width: 320px; width: 100%;',
            oninput: (e) => (opmode = e.target.value),
            value: opmode,
            onchange: setmode,
          },
          ['Normal', 'No Anon D/L', 'Gaming', 'Low traffic'].map((val, i) =>
            m(`option[value=${i + 1}]`, val)
          )
        ),
      ]),
    ],
  };
};

const displayIPAddresses = () => {
  return {
    view: ({ attrs: { details } }) =>
      details && m('.nw-config-row', { style: 'display: grid; grid-template-columns: 200px 1fr; gap: 1rem; align-items: flex-start; margin-bottom: 0.75rem;' }, [
        m('p', { style: 'font-weight: 600; color: #475569;' }, 'External Address: '),
        m(
          'ul.external-address',
          details.ipAddressList.map((ip) => m('li', ip))
        ),
      ]),
  };
};

const NetworkConfigForm = () => {
  let sslId = '';
  let details = {};
  let netStatus = {};
  let localAddr = '';
  let localPort = 0;
  let extAddr = '';
  let extPort = 0;
  let dyndns = '';
  let netMode = util.RS_NETMODE_EXT;

  const loadData = () => {
    rs.rsJsonApiRequest('/rsAccounts/getCurrentAccountId').then((res) => {
      if (res.body.retval) {
        sslId = res.body.id;
        rs.rsJsonApiRequest('/rsPeers/getPeerDetails', { sslId }).then((pRes) => {
          if (pRes.body.retval) {
            details = pRes.body.det;
            localAddr = details.localAddr || '';
            localPort = details.localPort || 0;
            extAddr = details.extAddr || '';
            extPort = details.extPort || 0;
            dyndns = details.dyndns || '';
            netMode = details.netMode || util.RS_NETMODE_EXT;
            m.redraw();
          }
        });
        rs.rsJsonApiRequest('/rsConfig/getConfigNetStatus', {}).then((nRes) => {
          if (nRes.body) {
            netStatus = nRes.body;
            if (netStatus.localPort) localPort = netStatus.localPort;
            if (netStatus.extPort) extPort = netStatus.extPort;
            m.redraw();
          }
        });
      }
    });
  };

  const saveLocalAddress = () => {
    if (!sslId) return;
    rs.rsJsonApiRequest('/rsPeers/setLocalAddress', {
      sslId,
      addr: localAddr,
      port: parseInt(localPort) || 0,
    }).then(() => loadData());
  };

  const saveExtAddress = () => {
    if (!sslId) return;
    rs.rsJsonApiRequest('/rsPeers/setExtAddress', {
      sslId,
      addr: extAddr,
      port: parseInt(extPort) || 0,
    }).then(() => loadData());
  };

  const saveDynDNS = () => {
    if (!sslId) return;
    rs.rsJsonApiRequest('/rsPeers/setDynDNS', {
      sslId,
      addr: dyndns,
    });
  };

  const saveNetMode = (newMode) => {
    if (!sslId) return;
    netMode = newMode;
    rs.rsJsonApiRequest('/rsPeers/setNetworkMode', {
      sslId,
      netMode: parseInt(newMode),
    }).then(() => loadData());
  };

  return {
    oninit: () => {
      loadData();
    },
    view: ({ attrs: { isHiddenMode } }) => {
      const isUpnpOk = Boolean(netStatus.netUpnpOk || netStatus.uPnPActive);
      const isLocalOk = Boolean(netStatus.netLocalOk !== false);
      const isExtOk = Boolean(netStatus.netExtAddressOk);

      return m('.network-config-form', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          width: '100%',
        }
      }, [
        // Network Mode row
        m('.nw-config-row', { style: 'display: grid; grid-template-columns: 200px 1fr; gap: 1rem; align-items: center;' }, [
          m('label', { style: 'font-weight: 600; color: #475569;' }, 'Network Mode'),
          m('.nw-mode-group', { style: 'display: flex; align-items: center; gap: 1rem;' }, [
            m(SetNwMode, { isHiddenMode, hideLabel: true }),
            isHiddenMode && m('.status-indicator', { style: 'display: flex; align-items: center; gap: 0.4rem;' }, [
              m('.bullet', {
                style: 'width: 10px; height: 10px; border-radius: 50%; background-color: #22c55e;'
              }),
              m('span', { style: 'font-size: 0.85rem; font-weight: 700; color: #000000;' }, '[Hidden mode]'),
            ]),
          ]),
        ]),

        // NAT row + UPnP status bullet
        !isHiddenMode && m('.nw-config-row', { style: 'display: grid; grid-template-columns: 200px 1fr; gap: 1rem; align-items: center;' }, [
          m('label', { style: 'font-weight: 600; color: #475569;' }, 'NAT'),
          m('.nat-control-group', { style: 'display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;' }, [
            m('select', {
              style: 'flex: 1; max-width: 320px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px;',
              value: netMode,
              onchange: (e) => saveNetMode(e.target.value),
            }, [
              m('option', { value: util.RS_NETMODE_UPNP }, 'Automatic (UPnP)'),
              m('option', { value: util.RS_NETMODE_UDP }, 'FireWalled'),
              m('option', { value: util.RS_NETMODE_EXT }, 'Manually Forwarded Port'),
            ]),
            m('.status-indicator', { style: 'display: flex; align-items: center; gap: 0.4rem;' }, [
              m('.bullet', {
                style: `width: 10px; height: 10px; border-radius: 50%; background-color: ${isUpnpOk ? '#22c55e' : '#475569'};`
              }),
              m('span', { style: 'font-size: 0.85rem; font-weight: 600; color: #334155;' }, 'UPnP'),
            ]),
          ]),
        ]),

        // Local Address + Port + Local network status bullet
        m('.nw-config-row', { style: 'display: grid; grid-template-columns: 200px 1fr; gap: 1rem; align-items: center;' }, [
          m('label', { style: 'font-weight: 600; color: #475569;' }, 'Local Address'),
          m('.addr-control-group', { style: 'display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;' }, [
            m('input[type=text]', {
              style: 'flex: 1; max-width: 320px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px;',
              value: localAddr,
              oninput: (e) => (localAddr = e.target.value),
              onchange: saveLocalAddress,
            }),
            m('.port-group', { style: 'display: flex; align-items: center; gap: 0.4rem;' }, [
              m('span', { style: 'font-size: 0.85rem; font-weight: 600; color: #475569;' }, 'Port:'),
              m('input[type=number]', {
                style: 'width: 90px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px;',
                value: localPort,
                oninput: (e) => (localPort = parseInt(e.target.value) || 0),
                onchange: saveLocalAddress,
              }),
            ]),
            !isHiddenMode && m('.status-indicator', { style: 'display: flex; align-items: center; gap: 0.4rem; margin-left: 0.5rem;' }, [
              m('.bullet', {
                style: `width: 10px; height: 10px; border-radius: 50%; background-color: ${isLocalOk ? '#22c55e' : '#ef4444'};`
              }),
              m('span', { style: 'font-size: 0.85rem; font-weight: 600; color: #334155;' }, 'Local network'),
            ]),
          ]),
        ]),

        // External Address + Port + External ip address finder status bullet
        m('.nw-config-row', { style: 'display: grid; grid-template-columns: 200px 1fr; gap: 1rem; align-items: center;' }, [
          m('label', { style: 'font-weight: 600; color: #475569;' }, 'External Address'),
          m('.addr-control-group', { style: 'display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;' }, [
            m('input[type=text]', {
              style: 'flex: 1; max-width: 320px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px;',
              value: isHiddenMode ? 'Hidden' : extAddr,
              disabled: isHiddenMode,
              oninput: (e) => (extAddr = e.target.value),
              onchange: saveExtAddress,
            }),
            !isHiddenMode && m('.port-group', { style: 'display: flex; align-items: center; gap: 0.4rem;' }, [
              m('span', { style: 'font-size: 0.85rem; font-weight: 600; color: #475569;' }, 'Port:'),
              m('input[type=number]', {
                style: 'width: 90px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px;',
                value: extPort,
                oninput: (e) => (extPort = parseInt(e.target.value) || 0),
                onchange: saveExtAddress,
              }),
            ]),
            !isHiddenMode && m('.status-indicator', { style: 'display: flex; align-items: center; gap: 0.4rem; margin-left: 0.5rem;' }, [
              m('.bullet', {
                style: `width: 10px; height: 10px; border-radius: 50%; background-color: ${isExtOk ? '#22c55e' : '#808080'};`
              }),
              m('span', { style: 'font-size: 0.85rem; font-weight: 600; color: #334155;' }, 'External ip address finder'),
            ]),
          ]),
        ]),

        // Dynamic DNS row
        !isHiddenMode && m('.nw-config-row', { style: 'display: grid; grid-template-columns: 200px 1fr; gap: 1rem; align-items: center;' }, [
          m('label', { style: 'font-weight: 600; color: #475569;' }, 'Dynamic DNS'),
          m('input[type=text]', {
            style: 'flex: 1; max-width: 320px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px;',
            value: dyndns,
            oninput: (e) => (dyndns = e.target.value),
            onchange: saveDynDNS,
          }),
        ]),
      ]);
    }
  };
};

const checkPortReachable = (addr, port, timeoutMs = 800) => {
  if (!addr || !port) return Promise.resolve(false);

  return new Promise((resolve) => {
    let resolved = false;
    const start = Date.now();
    const controller = new AbortController();

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        controller.abort();
        // Timeout expired without server connection -> Port is closed / not enabled!
        resolve(false);
      }
    }, timeoutMs);

    fetch(`http://${addr}:${port}`, {
      mode: 'no-cors',
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(true);
        }
      })
      .catch((err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          if (err && err.name === 'AbortError') {
            resolve(true);
          } else {
            // Tor SOCKS port returns HTTP 501 ("Tor is not an HTTP Proxy").
            // Connection refused fails in < 15ms. If Tor server responded (501 / > 20ms), port is OPEN!
            const duration = Date.now() - start;
            if (duration > 20 || (err && err.message && err.message.includes('501'))) {
              resolve(true);
            } else {
              resolve(false);
            }
          }
        }
      });
  });
};

const SetSocksProxy = () => {
  const socksProxyObj = {
    tor: {},
    i2p: {},
  };
  const fetchOutgoing = () => {
    Object.keys(socksProxyObj).forEach((proxyItem) => {
      const item = socksProxyObj[proxyItem];
      if (item.retval && item.addr && item.port) {
        checkPortReachable(item.addr, item.port).then((isReachable) => {
          item.outgoing = isReachable;
          m.redraw();
        });
      } else {
        item.outgoing = false;
        m.redraw();
      }
    });
  };
  const handleProxyChange = (proxyItem) => {
    rs.rsJsonApiRequest('/rsPeers/setProxyServer', {
      type: util[`RS_HIDDEN_TYPE_${proxyItem.toUpperCase()}`],
      addr: socksProxyObj[proxyItem].addr,
      port: socksProxyObj[proxyItem].port,
    }).then((res) => {
      if (res && res.body) {
        socksProxyObj[proxyItem] = res.body;
      }
      fetchOutgoing();
    });
  };
  return {
    oninit: () => {
      Object.keys(socksProxyObj).forEach((proxyItem) => {
        rs.rsJsonApiRequest('/rsPeers/getProxyServer', {
          type: util[`RS_HIDDEN_TYPE_${proxyItem.toUpperCase()}`],
        })
          .then((res) => {
            if (res && res.body) {
              socksProxyObj[proxyItem] = res.body;
            }
          })
          .then(fetchOutgoing);
      });
    },
    view: () =>
      m('.proxy-server-form', { style: 'display: flex; flex-direction: column; gap: 0.75rem; width: 100%;' }, [
        m('p.proxy-description', { style: 'margin-bottom: 0.5rem; color: #475569;' },
          'Configure your TOR and I2P SOCKS proxy here. It will allow you to also connect to hidden nodes.'
        ),
        Object.keys(socksProxyObj).map((proxyItem) => {
          const isTor = proxyItem === 'tor';
          const labelText = isTor ? 'TOR Socks Proxy:' : 'I2P Socks Proxy:';
          const outgoingText = isTor ? 'TOR outgoing' : 'I2P outgoing';
          const notEnabledText = isTor ? 'Tor proxy is not enabled' : 'I2P proxy is not enabled';
          const isOutgoing = socksProxyObj[proxyItem].outgoing;

          return m('.nw-config-row', { style: 'display: grid; grid-template-columns: 200px 1fr; gap: 1rem; align-items: center;' }, [
            m('label', { style: 'font-weight: 600; color: #475569;' }, labelText),
            m('.proxy-control-group', { style: 'display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;' }, [
              m('input[type=text]', {
                style: 'flex: 1; max-width: 480px; min-width: 320px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px;',
                value: socksProxyObj[proxyItem].addr || '',
                oninput: (e) => (socksProxyObj[proxyItem].addr = e.target.value),
                onchange: () => handleProxyChange(proxyItem),
              }),
              m('input[type=number]', {
                style: 'width: 90px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px;',
                value: socksProxyObj[proxyItem].port || 0,
                oninput: (e) => (socksProxyObj[proxyItem].port = parseInt(e.target.value) || 0),
                onchange: () => handleProxyChange(proxyItem),
              }),
              socksProxyObj[proxyItem].outgoing !== undefined &&
                m('.status-indicator', { style: 'display: flex; align-items: center; gap: 0.4rem; margin-left: 0.5rem;' }, [
                  m('.bullet', {
                    style: `width: 10px; height: 10px; border-radius: 50%; background-color: ${isOutgoing ? '#22c55e' : '#808080'};`,
                    title: isOutgoing ? 'Proxy seems to work.' : notEnabledText,
                  }),
                  m('span', { style: 'font-size: 0.85rem; font-weight: 600; color: #334155;' },
                    `${outgoingText} ${isOutgoing ? 'on' : 'off'}`
                  ),
                ]),
            ]),
          ]);
        }),
      ]),
  };
};

const displayHiddenServiceInfo = () => {
  return {
    view: ({ attrs: { details } }) =>
      details && details.hiddenNodeAddress &&
        m('.hidden-service-info', { style: 'display: flex; flex-direction: column; gap: 0.75rem; width: 100%;' }, [
          m('p.proxy-description', { style: 'margin-bottom: 0.5rem; color: #475569;' }, details.hiddenType === 4
            ? 'I2P has been automatically configured by Retroshare. You shouldn\'t need to change anything here.'
            : 'Tor has been automatically configured by Retroshare. You shouldn\'t need to change anything here.'
          ),
          // Local Address + Local Port row
          m('.nw-config-row', { style: 'display: grid; grid-template-columns: 200px 1fr; gap: 1rem; align-items: center;' }, [
            m('label', { style: 'font-weight: 600; color: #475569;' }, 'Local Address:'),
            m('.addr-port-group', { style: 'display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;' }, [
              m('input[type=text]', {
                style: 'flex: 1; max-width: 480px; min-width: 320px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px; background-color: #f8fafc; color: #334155;',
                readOnly: true,
                value: details.localAddr || '127.0.0.1',
              }),
              m('input[type=number]', {
                style: 'width: 90px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px; background-color: #f8fafc; color: #334155;',
                readOnly: true,
                value: details.localPort || 0,
              }),
            ]),
          ]),
          // Onion / I2P Address + Service Port row
          m('.nw-config-row', { style: 'display: grid; grid-template-columns: 200px 1fr; gap: 1rem; align-items: center;' }, [
            m('label', { style: 'font-weight: 600; color: #475569;' }, details.hiddenType === 4 ? 'I2P Address:' : 'Onion Address:'),
            m('.addr-port-group', { style: 'display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;' }, [
              m('input[type=text]', {
                style: 'flex: 1; max-width: 480px; min-width: 320px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px; background-color: #f8fafc; color: #334155; font-family: monospace;',
                readOnly: true,
                value: details.hiddenNodeAddress,
              }),
              details.hiddenNodePort && m('input[type=number]', {
                style: 'width: 90px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px; background-color: #f8fafc; color: #334155;',
                readOnly: true,
                value: details.hiddenNodePort,
              }),
            ]),
          ]),
        ]),
  };
};

const Component = () => {
  let details;
  let isHiddenMode = false;

  return {
    oninit: () => {
      rs.rsJsonApiRequest('/rsAccounts/getCurrentAccountId').then((res) => {
        if (res.body.retval) {
          rs.rsJsonApiRequest('/rsPeers/getPeerDetails', {
            sslId: res.body.id,
          }).then((res) => {
            if (res.body.retval) {
              details = res.body.det;
              isHiddenMode = Boolean(
                details && (
                  details.hiddenType === util.RS_HIDDEN_TYPE_TOR ||
                  details.hiddenType === util.RS_HIDDEN_TYPE_I2P ||
                  details.extAddr === 'Hidden'
                )
              );
              m.redraw();
            }
          });
        }
      });
    },
    view: () =>
      m('.config-network', { style: 'display:flex; flex-direction:column; gap:1rem;' }, [
        m('.widget', [
          m('.widget__heading', m('h3', 'Network Configuration')),
          m('.widget__body', [
            m(NetworkConfigForm, { isHiddenMode }),
            m('hr', { style: 'margin: 1rem 0; border: none; border-top: 1px solid #e2e8f0;' }),
            m(SetLimits),
            !isHiddenMode && m(SetOpMode),
            !isHiddenMode && m(displayIPAddresses, { details }),
          ]),
        ]),
        m('.widget', [
          m('.widget__heading', m('h3', 'Hidden Service Configuration')),
          m('.widget__body', [
            m(SetSocksProxy),
          ]),
        ]),
        isHiddenMode &&
          m('.widget', [
            m('.widget__heading', m('h3', details && details.hiddenType === 4 ? 'Incoming I2P' : 'Incoming Tor')),
            m('.widget__body', [
              m(displayHiddenServiceInfo, { details }),
            ]),
          ]),
      ]),
  };
};

module.exports = Component;
 
}); 
require.register("config/config_node", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');

const Node = () => {
  const nodeInfo = {
    setData(data) {
      Object.assign(nodeInfo, data.status);
    },
  };
  return {
    oninit() {
      rs.rsJsonApiRequest('/rsConfig/getConfigNetStatus', {}, nodeInfo.setData);
    },
    view() {
      return [
        m('.widget', [
          m('.widget__heading', m('h3', 'Public Information')),
          m('.widget__body', [
            m('ul', [
              m('li', 'Name: ' + nodeInfo.ownName),
              m('li', 'Location ID: ' + nodeInfo.ownId),
              m('li', 'Firewall: ' + nodeInfo.firewalled),
              m('li', 'Port Forwarding: ' + nodeInfo.forwardPort),
              m('li', 'DHT: ' + nodeInfo.DHTActive),
              m('li', 'uPnP: ' + nodeInfo.uPnPActive),
              m('li', 'Local Address: ' + nodeInfo.localAddr + '  Port: ' + nodeInfo.localPort),
            ]),
          ]),
        ]),
      ];
    },
  };
};

module.exports = Node;
 
}); 
require.register("config/config_people", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');

const Reputation = () => {
  let addFriendIdAsContacts = undefined;
  let usePositiveDefault = undefined;
  let deleteBannedAfter = undefined;
  let rememberBannedAfter = undefined;
  let negativeThreshold = undefined;
  let positiveThreshold = undefined;

  return {
    oninit: (vnode) => {
      rs.rsJsonApiRequest(
        '/rsIdentity/autoAddFriendIdsAsContact',
        {},
        (data) => (addFriendIdAsContacts = data.retval)
      );
      rs.rsJsonApiRequest(
        '/rsreputations/autoPositiveOpinionForContacts',
        {},
        (data) => (usePositiveDefault = data.retval)
      );
      rs.rsJsonApiRequest(
        '/rsIdentity/deleteBannedNodesThreshold',
        {},
        (data) => (deleteBannedAfter = data.retval)
      );
      rs.rsJsonApiRequest(
        '/rsreputations/rememberBannedIdThreshold',
        {},
        (data) => (rememberBannedAfter = data.retval)
      );
      rs.rsJsonApiRequest(
        '/rsreputations/thresholdForRemotelyPositiveReputation',
        {},
        (data) => (positiveThreshold = data.retval)
      );
      rs.rsJsonApiRequest(
        '/rsreputations/thresholdForRemotelyNegativeReputation',
        {},
        (data) => (negativeThreshold = data.retval)
      );
    },
    view: (vnode) =>
      m('.widget', [
        m('.widget__heading', m('h3', 'Reputation')),
        m('.widget__body', [
          m('.grid-2col', [
            m('p', 'Use "positive" as the default opinion for contacts(instead of neutral):'),
            m('input[type=checkbox]', {
              checked: usePositiveDefault,
              oninput: (e) => {
                usePositiveDefault = e.target.checked;
                rs.rsJsonApiRequest(
                  '/rsreputations/setAutoPositiveOpinionForContacts',
                  {
                    b: usePositiveDefault,
                  },
                  () => {}
                );
              },
            }),
            m('p', 'Automatically add identities owned by friend nodes to my contacts:'),
            m('input[type=checkbox]', {
              checked: addFriendIdAsContacts,
              oninput: (e) => {
                addFriendIdAsContacts = e.target.checked;
                rs.rsJsonApiRequest(
                  '/rsIdentity/setAutoAddFriendIdsAsContact',
                  {
                    enabled: addFriendIdAsContacts,
                  },
                  () => {}
                );
              },
            }),
            m('p', 'Difference in votes (+/-) to rate an ID positively:'),
            m('input[type=number]', {
              oninput: (e) => (positiveThreshold = parseInt(e.target.value)),
              value: positiveThreshold,
              onchange: () =>
                rs.rsJsonApiRequest(
                  '/rsreputations/setThresholdForRemotelyPositiveReputation',
                  {
                    thresh: positiveThreshold,
                  },
                  () => {}
                ),
            }),
            m('p', 'Difference in votes (+/-) to rate an ID negatively:'),
            m('input[type=number]', {
              oninput: (e) => (negativeThreshold = parseInt(e.target.value)),
              value: negativeThreshold,
              onchange: () =>
                rs.rsJsonApiRequest(
                  '/rsreputations/setThresholdForRemotelyNegativeReputation',
                  {
                    thresh: negativeThreshold,
                  },
                  () => {}
                ),
            }),
            m('p', 'Delete banned identities after(0 means never):'),
            m('input[type=number]', {
              oninput: (e) => (deleteBannedAfter = parseInt(e.target.value)),
              value: deleteBannedAfter,
              onchange: () =>
                rs.rsJsonApiRequest(
                  '/rsIdentity/setDeleteBannedNodesThreshold',
                  {
                    days: deleteBannedAfter,
                  },
                  () => {}
                ),
            }),
            m('p', 'Reset reputation of banned identities after (0 means never):'),
            m('input[type=number]', {
              oninput: (e) => (rememberBannedAfter = parseInt(e.target.value)),
              value: rememberBannedAfter,
              onchange: () =>
                rs.rsJsonApiRequest(
                  '/rsreputations/setRememberBannedIdThreshold',
                  {
                    days: rememberBannedAfter,
                  },
                  () => {}
                ),
            }),
          ]),
        ]),
      ]),
  };
};

const Layout = () => {
  return {
    view: (vnode) => [m(Reputation)],
  };
};

module.exports = Layout;
 
}); 
require.register("config/config_resolver", function(exports, require, module) { 
const m = require('mithril');
const widget = require('widgets');

const sections = {
  network: require('config/config_network'),
  node: require('config/config_node'),
  services: require('config/config_services'),
  files: require('config/config_files'),
  people: require('config/config_people'),
  chat: require('config/config_chat'),
  mail: require('config/config_mail'),
};

const Layout = {
  view: (vnode) => [
    m(widget.Sidebar, {
      tabs: Object.keys(sections),
      baseRoute: '/config/',
      mobileDrawer: true,
    }),
    m('.node-panel', vnode.children),
  ],
};

module.exports = {
  view: (vnode) => {
    const tab = vnode.attrs.tab;
    return m(Layout, m(sections[tab]));
  },
};
 
}); 
require.register("config/config_services", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');

const servicesInfo = {
  list: [],

  setData(data) {
    servicesInfo.list = data.info.mServiceList;
  },
};

const Service = () => {
  let defaultAllowed = undefined;
  return {
    oninit: (v) =>
      rs.rsJsonApiRequest(
        '/rsServiceControl/getServicePermissions',
        {
          serviceId: v.attrs.data.key,
        },
        (retval) => (defaultAllowed = retval.permissions.mDefaultAllowed)
      ),
    view: (v) =>
      m(
        'tr',
        {
          key: v.attrs.data.key,
        },
        [
          m('td', v.attrs.data.value.mServiceName),
          m('td', v.attrs.data.value.mServiceType),
          m('td', v.attrs.data.value.mVersionMajor + '.' + v.attrs.data.value.mVersionMinor),
          m(
            'td',
            m('input[type=checkbox]', {
              checked: defaultAllowed,
              oninput: (e) => {
                defaultAllowed = e.target.checked;
                rs.rsJsonApiRequest('/rsServiceControl/updateServicePermissions', {
                  serviceId: v.attrs.data.key,
                  permissions: {
                    mDefaultAllowed: defaultAllowed,
                  },
                });
              },
            })
          ),
        ]
      ),
  };
};

const MyServices = {
  oninit() {
    rs.rsJsonApiRequest('/rsServiceControl/getOwnServices', {}, servicesInfo.setData);
  },
  view() {
    return m('.widget', [
      m('.widget__heading', m('h3', 'My Services')),
      m('.widget__body', [
        m('table', [
          m('tr', [
            m('th', 'Name'),
            m('th', 'ID'),
            m('th', 'Version'),
            m('th', 'Allow by default'),
          ]),
          servicesInfo.list.map((data) =>
            m(Service, {
              data,
            })
          ),
        ]),
      ]),
    ]);
  },
};

module.exports = {
  view: () => {
    return m(MyServices);
  },
};
 
}); 
require.register("config/config_util", function(exports, require, module) { 
const m = require('mithril');

/* Visibility parameter for discovery */
const RS_VS_DISC_OFF = 0x0000;
const RS_VS_DISC_MINIMAL = 0x0001;
const RS_VS_DISC_FULL = 0x0002;

const RS_VS_DHT_OFF = 0x0000;
const RS_VS_DHT_PASSIVE = 0x0001;
const RS_VS_DHT_FULL = 0x0002;

const MAX_TAG_ID_VAL = 1000000;
const MIN_TAG_ID_VAL = 100;

// Distant Messaging Permission Flags to define who we accept to talk to.
// Each flag *removes* some people.
const RS_DISTANT_MESSAGING_PERMISSION_FLAG_FILTER_NONE = 0;
const RS_DISTANT_MESSAGING_PERMISSION_FLAG_FILTER_NON_CONTACTS = 1;
const RS_DISTANT_MESSAGING_PERMISSION_FLAG_FILTER_EVERYBODY = 2;

// Hidden Service Configuration Type
const RS_HIDDEN_TYPE_NONE = 0;
const RS_HIDDEN_TYPE_UNKNOWN = 1;
const RS_HIDDEN_TYPE_TOR = 2;
const RS_HIDDEN_TYPE_I2P = 4;

// NAT Net Mode
const RS_NETMODE_UDP = 1;
const RS_NETMODE_UPNP = 2;
const RS_NETMODE_EXT = 3;

// Default Encryption Policy
const RS_FILE_CTRL_ENCRYPTION_POLICY_STRICT = 1;
const RS_FILE_CTRL_ENCRYPTION_POLICY_PERMISSIVE = 2;

// Direct Download Permission
const RS_FILE_PERM_DIRECT_DL_YES = 1;
const RS_FILE_PERM_DIRECT_DL_NO = 2;
const RS_FILE_PERM_DIRECT_DL_PER_USER = 3;

function getRandomId(tagArr) {
  const random = Math.floor(Math.random() * (MAX_TAG_ID_VAL - MIN_TAG_ID_VAL) + MIN_TAG_ID_VAL);
  tagArr.forEach((tag) => {
    if (tag.key === random) {
      return getRandomId(tagArr);
    }
  });
  return random;
}

function tooltip(text) {
  return m('.tooltip', [m('i.fas.fa-info-circle'), m('.tooltiptext', text)]);
}

module.exports = {
  getRandomId,
  tooltip,
  RS_VS_DHT_FULL,
  RS_VS_DHT_OFF,
  RS_VS_DISC_FULL,
  RS_VS_DHT_PASSIVE,
  RS_VS_DISC_OFF,
  RS_VS_DISC_MINIMAL,
  RS_DISTANT_MESSAGING_PERMISSION_FLAG_FILTER_NONE,
  RS_DISTANT_MESSAGING_PERMISSION_FLAG_FILTER_NON_CONTACTS,
  RS_DISTANT_MESSAGING_PERMISSION_FLAG_FILTER_EVERYBODY,
  RS_HIDDEN_TYPE_NONE,
  RS_HIDDEN_TYPE_UNKNOWN,
  RS_HIDDEN_TYPE_TOR,
  RS_HIDDEN_TYPE_I2P,
  RS_NETMODE_UDP,
  RS_NETMODE_UPNP,
  RS_NETMODE_EXT,
  RS_FILE_CTRL_ENCRYPTION_POLICY_STRICT,
  RS_FILE_CTRL_ENCRYPTION_POLICY_PERMISSIVE,
  RS_FILE_PERM_DIRECT_DL_YES,
  RS_FILE_PERM_DIRECT_DL_NO,
  RS_FILE_PERM_DIRECT_DL_PER_USER,
};
 
}); 
require.register("files/files_downloads", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const util = require('files/files_util');
const widget = require('widgets');

const Downloads = {
  strategies: {},
  statusMap: {},
  hashes: [],
  chunksMap: {},

  loadStrategy() {
    rs.rsJsonApiRequest('/rsFiles/FileDownloads', {}, (d) =>
      d.hashs.map((hash) => {
        rs.rsJsonApiRequest('/rsFiles/getChunkStrategy', { hash }).then((res) => {
          if (res.body.retval) Downloads.strategies[hash] = res.body.s;
        });
      })
    );
  },

  async loadHashes() {
    await rs
      .rsJsonApiRequest('/rsFiles/FileDownloads', {}, (d) => (Downloads.hashes = d.hashs))
      .then(() => {
        Downloads.hashes.forEach((hash) => {
          rs.rsJsonApiRequest('/rsFiles/FileDownloadChunksDetails', {
            hash,
          }).then((res) => (this.chunksMap[hash] = res.body.info));
        });
      });
  },

  async loadStatus() {
    await Downloads.loadHashes();
    const fileKeys = Object.keys(Downloads.statusMap);
    if (Downloads.hashes !== undefined && Downloads.hashes.length !== fileKeys.length) {
      if (Downloads.hashes.length > fileKeys.length) {
        // New file added
        const newHashes = util.compareArrays(Downloads.hashes, fileKeys);
        for (const hash of newHashes) {
          Downloads.updateFileDetail(hash, true);
        }
      } else {
        // Existing file removed
        const oldHashes = util.compareArrays(fileKeys, Downloads.hashes);
        for (const hash of oldHashes) {
          delete Downloads.statusMap[hash];
        }
      }
    }
    for (const hash in Downloads.statusMap) {
      Downloads.updateFileDetail(hash);
    }
  },
  resetSearch() {
    for (const hash in Downloads.statusMap) {
      Downloads.statusMap[hash].isSearched = true;
    }
  },
  updateFileDetail(hash, isNew = false) {
    rs.rsJsonApiRequest(
      '/rsFiles/FileDetails',
      {
        hash,
        hintflags: 16, // RS_FILE_HINTS_DOWNLOAD
      },
      (fileStat) => {
        if (!fileStat.retval) {
          console.error('Error: Unknown hash in Downloads: ', hash);
          return;
        }
        fileStat.info.isSearched = isNew ? true : Downloads.statusMap[hash].isSearched;
        Downloads.statusMap[hash] = fileStat.info;
      }
    );
  },
};

function InvalidFileMessage() {
  widget.popupMessage([
    m('i.fas.fa-file-medical'),
    m('h3', 'Add new file'),
    m('hr'),
    m('p', 'Error: could not add file'),
  ]);
}

function addFile(url) {
  // valid url format: retroshare://file?name=...&size=...&hash=...
  if (!url.startsWith('retroshare://')) {
    InvalidFileMessage();
    return;
  }
  const details = m.parseQueryString(url.split('?')[1]);
  if (
    !Object.prototype.hasOwnProperty.call(details, 'name') ||
    !Object.prototype.hasOwnProperty.call(details, 'size') ||
    !Object.prototype.hasOwnProperty.call(details, 'hash')
  ) {
    InvalidFileMessage();
    return;
  }
  rs.rsJsonApiRequest(
    '/rsFiles/FileRequest',
    {
      fileName: details.name,
      hash: details.hash,
      flags: util.RS_FILE_REQ_ANONYMOUS_ROUTING,
      size: {
        xstr64: details.size,
      },
    },
    (status) => {
      widget.popupMessage([
        m('i.fas.fa-file-medical'),
        m('h3', 'Add new file'),
        m('hr'),
        m('p', 'Successfully added file!'),
      ]);
    }
  );
}

const NewFileDialog = () => {
  let url = '';
  return {
    view: () => [
      m('i.fas.fa-file-medical'),
      m('h3', 'Add new file'),
      m('hr'),
      m('p', 'Enter the file link:'),
      m('input[type=text][name=fileurl]', {
        onchange: (e) => (url = e.target.value),
      }),
      m('button', { onclick: () => addFile(url) }, 'Add'),
    ],
  };
};

const Component = () => {
  function clearFileCompleted() {
    rs.rsJsonApiRequest('/rsFiles/FileClearCompleted');
  }
  return {
    oninit: () => {
      Downloads.loadStrategy();
      rs.setBackgroundTask(Downloads.loadStatus, 1000, () => m.route.get() === '/files/files');
      Downloads.resetSearch();
    },
    view: () => [
      m('.widget__body-heading', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' } }, [
        m('.action', { style: { marginBottom: '10px' } }, [
          m('button', { onclick: () => widget.popupMessage(m(NewFileDialog)) }, 'Add new file'),
          m('button', { onclick: clearFileCompleted }, 'Clear completed'),
        ]),
        m('h3', `Downloads (${Downloads.hashes ? Downloads.hashes.length : 0} files)`),
      ]),
      m('.widget__body-content', [
        Downloads.statusMap &&
        Object.keys(Downloads.statusMap).map((hash) =>
          m(util.File, {
            info: Downloads.statusMap[hash],
            strategy: Downloads.strategies[hash],
            direction: 'down',
            transferred: Downloads.statusMap[hash].transfered.xint64,
            chunksInfo: Downloads.chunksMap[hash],
          })
        ),
      ]),
    ],
  };
};

module.exports = {
  Component,
  Downloads,
  list: Downloads.statusMap,
};
 
}); 
require.register("files/files_manager", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const widget = require('widgets');
const futil = require('files/files_util');
const cutil = require('config/config_util');

const shareManagerInfo = `
  This is a list of shared folders. You can add and remove folders using the buttons at the bottom.
  e.g- You can click on Edit button and then modify any field. When you add a new folder, initially
  all files in that folder are shared. You can separately share flags for each shared directory.
`;

const accessTooltipText = [
  'Manage Control Access for Directories, The three options are for the following purpose.',
  m('i.fas.fa-search'),
  ' Directory can be searched anonymously, ',
  m('i.fas.fa-download'),
  ' Directory can be accessed anonymously, ',
  m('i.fas.fa-eye'),
  ' Directory can be browsed by designated friends',
];

const addNewDirInfo = `For Security reasons, Browsers don't allow to read directories so Please
  copy and paste the absolute path of the directory which you want to share.
`;

let sharedDirArr = [];
let isEditDisabled = true;

function loadSharedDirectories() {
  rs.rsJsonApiRequest('/rsFiles/getSharedDirectories').then((res) => {
    if (res.body.retval) sharedDirArr = res.body.dirs;
  });
}

// Update Shared Directories when there is a corresponding event
rs.events[rs.RsEventsType.SHARED_DIRECTORIES] = {
  handler: (event) => {
    switch (event.mEventCode) {
      case futil.RsSharedDirectoriesEventCode.SHARED_DIRS_LIST_CHANGED:
        loadSharedDirectories();
        break;
    }
  },
};

const AddSharedDirForm = () => {
  let newDirPath = '';

  function addNewSharedDirectory() {
    // check if newDirPath already exists
    const sharedDirArrExists = sharedDirArr.find((item) => item.filename === newDirPath);
    if (sharedDirArrExists) {
      alert('The path you entered already exists.');
      return;
    }
    const newSharedDir = {
      dir: {
        filename: newDirPath,
        virtualname: '',
        shareflags: futil.DIR_FLAGS_ANONYMOUS_SEARCH | futil.DIR_FLAGS_ANONYMOUS_DOWNLOAD,
        parent_groups: [],
      },
    };
    rs.rsJsonApiRequest('/rsFiles/addSharedDirectory', { ...newSharedDir }).then((res) => {
      if (res.body.retval) {
        loadSharedDirectories();
      }
      widget.popupMessage(
        m('.widget', [
          m('.widget__heading', m('h3', 'Add Shared Directory')),
          m(
            '.widget__body',
            m(
              'p',
              res.body.retval
                ? 'Successfully Added Directory to Shared List'
                : 'Error in Adding Directory to Shared List'
            )
          ),
        ])
      );
    });
  }

  return {
    view: () =>
      m('.widget', [
        m('.widget__heading', m('h3', 'Add New Directory')),
        m('form.widget__body.share-manager__form', { onsubmit: addNewSharedDirectory }, [
          m('blockquote.info', addNewDirInfo),
          m('.share-manager__form_input', [
            m('label', 'Enter absolute directory path :'),
            m('input[type=text]', {
              value: newDirPath,
              oninput: (e) => (newDirPath = e.target.value),
            }),
          ]),
          m('button[type=submit]', 'Add Directory'),
        ]),
      ]),
  };
};

const ManageVisibility = () => {
  function handleSubmit() {
    m.redraw();
    const mContainer = document.getElementById('modal-container');
    mContainer.style.display = 'none';
  }
  return {
    view: (v) => {
      const { parentGroups } = v.attrs;
      return m('.widget', [
        m('.widget__heading', m('h3', 'Manage Visibility')),
        m('form.widget__body', { onsubmit: handleSubmit }, [
          Object.keys(futil.RsNodeGroupId).map((groupId) =>
            m('div.manage-visibility', [
              m(`label[for=${futil.RsNodeGroupId[groupId]}]`, futil.RsNodeGroupId[groupId]),
              m(`input[type=checkbox][id=${futil.RsNodeGroupId[groupId]}]`, {
                // if parentGroups is empty it means All friends nodes have Visibility
                checked: parentGroups.includes(groupId),
                onclick: () => {
                  if (parentGroups.includes(groupId)) {
                    const groupItemIndex = parentGroups.indexOf(groupId);
                    parentGroups.splice(groupItemIndex, 1);
                  } else {
                    parentGroups.push(groupId);
                  }
                },
              }),
            ])
          ),
          m('button[type=submit]', 'OK'),
        ]),
      ]);
    },
  };
};

const ShareDirTable = () => {
  return {
    oninit: futil.loadRsNodeGroupId,
    view: () => {
      return m('table.share-manager__table', [
        m(
          'thead.share-manager__table_heading',
          m('tr', [
            m('td', 'Shared Directories'),
            m('td', 'Visible Name'),
            m('td', 'Access', cutil.tooltip(accessTooltipText)),
            m('td', 'Visibility'),
          ])
        ),
        m(
          'tbody.share-manager__table_body',
          sharedDirArr.length &&
          sharedDirArr.map((sharedDirItem, index) => {
            const {
              filename,
              virtualname,
              shareflags,
              parent_groups: parentGroups,
            } = sharedDirItem;
            const sharedFlags = futil.calcIndividualFlags(shareflags);
            return m('tr', [
              m(
                'td',
                m('input[type=text]', {
                  value: filename,
                  disabled: isEditDisabled,
                  oninput: (e) => {
                    sharedDirArr[index].filename = e.target.value;
                  },
                })
              ),
              m(
                'td',
                m('input[type=text]', {
                  value: virtualname,
                  disabled: isEditDisabled,
                  oninput: (e) => {
                    sharedDirArr[index].virtualname = e.target.value;
                  },
                })
              ),
              m(
                'td.share-flags',
                Object.keys(sharedFlags).map((flag) => {
                  return [
                    m(`input.share-flags-check[type=checkbox][id=${flag}]`, {
                      checked: sharedFlags[flag],
                      disabled: isEditDisabled,
                    }),
                    m(
                      `label.share-flags-label[for=${flag}]`,
                      {
                        onclick: () => {
                          if (isEditDisabled) return;
                          sharedFlags[flag] = !sharedFlags[flag];
                          sharedDirArr[index].shareflags = futil.calcShareFlagsValue(sharedFlags);
                        },
                        style: isEditDisabled && { color: '#7D7D7D' },
                      },
                      m(
                        // check the flag type then if its value is true then only render the icon
                        flag === 'isAnonymousSearch'
                          ? sharedFlags[flag]
                            ? 'i.fas.fa-search'
                            : 'span'
                          : flag === 'isAnonymousDownload'
                            ? sharedFlags[flag]
                              ? 'i.fas.fa-download'
                              : 'span'
                            : sharedFlags[flag]
                              ? 'i.fas.fa-eye'
                              : 'span'
                      )
                    ),
                  ];
                })
              ),
              m(
                'td',
                {
                  // since this is not an input element, manually change color
                  style: { color: isEditDisabled ? '#6D6D6D' : 'black' },
                  onclick: () =>
                    !isEditDisabled && widget.popupMessage(m(ManageVisibility, { parentGroups })),
                },
                parentGroups.length === 0
                  ? 'All Friend nodes'
                  : parentGroups.map((groupFlag) => futil.RsNodeGroupId[groupFlag]).join(', ')
              ),
            ]);
          })
        ),
      ]);
    },
  };
};

const ShareManager = () => {
  function setNewSharedDirectories() {
    rs.rsJsonApiRequest('/rsFiles/setSharedDirectories', {
      dirs: sharedDirArr,
    });
  }
  return {
    oninit: loadSharedDirectories,
    view: () => {
      return m('.widget', [
        m('.widget__heading', m('h3', 'ShareManager')),
        m('form.widget__body.share-manager', { onsubmit: setNewSharedDirectories }, [
          m('blockquote.info', shareManagerInfo),
          m(ShareDirTable),
          m('.share-manager__actions', [
            m('button', { onclick: () => widget.popupMessage(m(AddSharedDirForm)) }, 'Add New'),
            m(
              'button',
              { onclick: () => (isEditDisabled = !isEditDisabled) },
              isEditDisabled ? 'Edit' : 'Apply and Close'
            ),
          ]),
        ]),
      ]);
    },
  };
};

module.exports = ShareManager;
 
}); 
require.register("files/files_proxy", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const futil = require('files/files_util');

const fileProxyObj = futil.createProxy({}, () => {
  m.redraw();
});

rs.events[rs.RsEventsType.FILE_TRANSFER] = {
  handler: (event) => {
    // if request item doesn't already exists in Object then create new item
    if (!Object.prototype.hasOwnProperty.call(fileProxyObj, event.mRequestId)) {
      fileProxyObj[event.mRequestId] = [];
    }

    event.mResults.forEach((newRes) => {
      const isAlt = fileProxyObj[event.mRequestId].some(
        (oldRes) => oldRes.fHash === newRes.fHash && oldRes.fName === newRes.fName
      );
      if (!isAlt) {
        fileProxyObj[event.mRequestId].push(newRes);
      }
    });
  },
};

module.exports = {
  fileProxyObj,
};
 
}); 
require.register("files/files_resolver", function(exports, require, module) { 
const m = require('mithril');

const widget = require('widgets');

const downloads = require('files/files_downloads');
const uploads = require('files/files_uploads');
const util = require('files/files_util');
const search = require('files/files_search');
const myfile = require('files/my_files');
const friendfile = require('files/friends_files');

const MyFiles = () => {
  return {
    view: () => [
      m('.widget__heading', [
        m('h3', 'File Transfers'),
        m(util.SearchBar, {
          list: Object.assign({}, downloads.list, uploads.list),
        }),
      ]),
      m('.widget__body', [m(downloads.Component), m(uploads.Component)]),
    ],
  };
};

const sections = {
  files: MyFiles,
  search,
  MyFiles: myfile,
  FriendsFiles: friendfile,
};

const Layout = {
  view: (vnode) => [
    m(widget.Sidebar, {
      tabs: Object.keys(sections),
      baseRoute: '/files/',
      mobileDrawer: true,
    }),
    m('.node-panel', m('.widget', vnode.children)),
  ],
};

module.exports = {
  view: (vnode) => {
    const tab = vnode.attrs.tab;
    return m(Layout, m(sections[tab]));
  },
};
 
}); 
require.register("files/files_search", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const widget = require('widgets');
const futil = require('files/files_util');
const fproxy = require('files/files_proxy');

let matchString = '';
let currentItem = 0;
const reqObj = {};

function handleSubmit() {
  rs.rsJsonApiRequest('/rsFiles/turtleSearch', { matchString })
    .then((res) => {
      // Add prefix to obj keys so that javascript doesn't sort them
      reqObj['_' + res.body.retval] = matchString;
      currentItem = '_' + res.body.retval;
    })
    .catch((error) => { });
}

const SearchBar = () => {
  return {
    view: () =>
      m('form.search-form', {
        onsubmit: (event) => {
          event.preventDefault();
          handleSubmit();
        },
      }, [
        m('input[type=text][placeholder=Search files]', {
          value: matchString,
          oninput: (e) => (matchString = e.target.value),
        }),
        m('button[type=submit]', m('i.fas.fa-search')),
      ]),
  };
};

const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  switch (ext) {
    case 'pdf': return 'i.fas.fa-file-pdf';
    case 'zip':
    case 'rar':
    case 'tar':
    case 'gz':
    case '7z': return 'i.fas.fa-file-archive';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif': return 'i.fas.fa-file-image';
    case 'mp4':
    case 'mkv':
    case 'avi':
    case 'mov': return 'i.fas.fa-file-video';
    case 'mp3':
    case 'wav':
    case 'flac': return 'i.fas.fa-file-audio';
    case 'txt':
    case 'doc':
    case 'docx': return 'i.fas.fa-file-alt';
    default: return 'i.fas.fa-file';
  }
};

const Layout = () => {
  let active = 0;
  function handleFileDownload(item) {
    rs.rsJsonApiRequest('/rsFiles/FileRequest', {
      fileName: item.fName,
      hash: item.fHash,
      flags: futil.RS_FILE_REQ_ANONYMOUS_ROUTING,
      size: {
        xstr64: item.fSize.xstr64,
      },
    })
      .then((res) => {
        widget.popupMessage(
          m('.widget', [
            m('.widget__heading', m('h3', m('i.fas.fa-file-medical'), ' File Download')),
            m(
              '.widget__body',
              m('p', `File is ${res.body.retval ? 'getting' : 'already'} downloaded.`)
            ),
          ])
        );
      })
      .catch((error) => {
        // console.log('error in sending download request: ', error);
      });
  }
  return {
    view: () => [
      m('.widget__heading', [m('h3', 'Search'), m(SearchBar)]),
      m('.widget__body', [
        m('div.file-search-container', [
          m('div.file-search-container__keywords', [
            m('.keywords-header', [
              m('h5.bold', 'Keywords'),
              m(
                'button.red.clear-btn',
                {
                  onclick: () => {
                    Object.keys(reqObj).forEach((key) => delete reqObj[key]);
                    Object.keys(fproxy.fileProxyObj).forEach((key) => delete fproxy.fileProxyObj[key]);
                    currentItem = 0;
                    active = 0;
                  },
                },
                'Clear'
              ),
            ]),
            Object.keys(reqObj).length !== 0 &&
            m(
              'div.keywords-container',
              Object.keys(reqObj)
                .reverse()
                .map((item, index) => {
                  return m(
                    m.route.Link,
                    {
                      class: active === index ? 'selected' : '',
                      onclick: () => {
                        active = index;
                        currentItem = item;
                      },
                      href: `/files/search/${item}`,
                    },
                    reqObj[item]
                  );
                })
            ),
          ]),
          m('div.file-search-container__results', [
            Object.keys(fproxy.fileProxyObj).length === 0 || currentItem === 0
              ? m('h5.bold', 'Results')
              : m('div.results-container', [
                m(
                  'div.results-header',
                  m('.results-row', [
                    m('.results-cell.name-col', 'Name'),
                    m('.results-cell.size-col', 'Size'),
                    m('.results-cell.hash-col', 'Hash'),
                    m('.results-cell.action-col', 'Download'),
                  ])
                ),
                m(
                  'div.results-list',
                  fproxy.fileProxyObj[currentItem.slice(1)]
                    ? fproxy.fileProxyObj[currentItem.slice(1)].map((item) =>
                      m('div.results-row.file-item', [
                        m('.results-cell.name-col', { 'data-label': 'Name' }, [
                          m(getFileIcon(item.fName)),
                          m('span', item.fName),
                        ]),
                        m(
                          '.results-cell.size-col',
                          { 'data-label': 'Size' },
                          rs.formatBytes((item.fSize && (item.fSize.xint64 || item.fSize.xstr64)) || 0)
                        ),
                        m('.results-cell.hash-col', { 'data-label': 'Hash' }, item.fHash),
                        m(
                          '.results-cell.action-col',
                          m(
                            'button.download-btn-v65',
                            { onclick: () => handleFileDownload(item) },
                            'Download'
                          )
                        ),
                      ])
                    )
                    : 'No Results.'
                ),
              ]),
          ]),
        ]),
      ]),
    ],
  };
};

module.exports = {
  view: () => m(Layout),
};
 
}); 
require.register("files/files_uploads", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const util = require('files/files_util');

const Uploads = {
  statusMap: {},
  hashes: [],

  loadHashes() {
    rs.rsJsonApiRequest('/rsFiles/FileUploads', {}, (d) => (Uploads.hashes = d.hashs));
  },

  loadStatus() {
    Uploads.loadHashes();
    const fileKeys = Object.keys(Uploads.statusMap);
    if (Uploads.hashes.length !== fileKeys.length) {
      // New file added
      if (Uploads.hashes.length > fileKeys.length) {
        const newHashes = util.compareArrays(Uploads.hashes, fileKeys);
        for (const hash of newHashes) {
          Uploads.updateFileDetail(hash, true);
        }
      }
      // Existing file removed
      else {
        const oldHashes = util.compareArrays(fileKeys, Uploads.hashes);
        for (const hash of oldHashes) {
          delete Uploads.statusMap[hash];
        }
      }
    }
    for (const hash in Uploads.statusMap) {
      Uploads.updateFileDetail(hash);
    }
  },
  updateFileDetail(hash, isNew = false) {
    rs.rsJsonApiRequest(
      '/rsFiles/FileDetails',
      {
        hash,
        hintflags: 32, // RS_FILE_HINTS_UPLOAD
      },
      (fileStat) => {
        if (!fileStat.retval) {
          console.error('Error: Unknown hash in Uploads: ', hash);
          return;
        }
        fileStat.info.isSearched = isNew ? true : Uploads.statusMap[hash].isSearched;
        Uploads.statusMap[hash] = fileStat.info;
      }
    );
  },
};

function averageOf(peers) {
  return peers.reduce((s, e) => s + e.transfered.xint64, 0) / peers.length;
}

const Component = () => {
  return {
    oninit: () =>
      rs.setBackgroundTask(Uploads.loadStatus, 1000, () => {
        return m.route.get() === '/files/files';
      }),
    view: () =>
      Uploads.hashes.length > 0
        ? m('.widget', [
            m('h3', 'Uploads (' + Uploads.hashes.length + ' files)'),
            m('hr'),
            Object.keys(Uploads.statusMap).map((hash) =>
              m(util.File, {
                info: Uploads.statusMap[hash],
                direction: 'up',
                transferred: averageOf(Uploads.statusMap[hash].peers),
                parts: Uploads.statusMap[hash].peers.reduce(
                  (a, e) => [...a, e.transfered.xint64],
                  []
                ),
              })
            ),
          ])
        : [],
  };
};

module.exports = {
  Component,
  list: Uploads.statusMap,
};
 
}); 
require.register("files/files_util", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const widget = require('widgets');

const RS_FILE_CTRL_PAUSE = 0x00000100;
const RS_FILE_CTRL_START = 0x00000200;
const RS_FILE_CTRL_FORCE_CHECK = 0x00000400;

const FT_STATE_FAILED = 0x0000;
const FT_STATE_OKAY = 0x0001;
const FT_STATE_WAITING = 0x0002;
const FT_STATE_DOWNLOADING = 0x0003;
const FT_STATE_COMPLETE = 0x0004;
const FT_STATE_QUEUED = 0x0005;
const FT_STATE_PAUSED = 0x0006;
const FT_STATE_CHECKING_HASH = 0x0007;

const RS_FILE_REQ_ANONYMOUS_ROUTING = 0x00000040;
const RS_FILE_HINTS_REMOTE = 0x00000008;
const RS_FILE_HINTS_LOCAL = 0x00000004;

// Flags for directory sharing permissions.
const DIR_FLAGS_ANONYMOUS_SEARCH = 0x0800;
const DIR_FLAGS_ANONYMOUS_DOWNLOAD = 0x0080;
const DIR_FLAGS_BROWSABLE = 0x0400;

const RsSharedDirectoriesEventCode = {
  UNKNOWN                  : 0x00,
  HASHING_PROCESS_STARTED  : 0x01,
  HASHING_PROCESS_PAUSED   : 0x02,
  HASHING_PROCESS_RESUMED  : 0x04,
  HASHING_PROCESS_FINISHED : 0x05,
  HASHING_FILE             : 0x06,
  SAVING_FILE_INDEX        : 0x07,
  EXTRA_LIST_FILE_ADDED    : 0x08,
  EXTRA_LIST_FILE_REMOVED  : 0x09,
  SHARED_DIRS_LIST_CHANGED : 0x0a,
  FRIEND_DIR_LIST_UPDATED  : 0x0b,
  OWN_DIR_LIST_UPDATED     : 0x0c,
  OWN_DIR_LIST_PROCESSING  : 0x0d,
};

/* eslint-disable no-unused-vars */

// Access Permission calculated by performing OR operation on the above three flags.
const DIR_FLAGS_PERMISSIONS_MASK =
  DIR_FLAGS_ANONYMOUS_SEARCH | DIR_FLAGS_ANONYMOUS_DOWNLOAD | DIR_FLAGS_BROWSABLE;

/* eslint-enable no-unused-vars */

// parent_groups visibility
const RsNodeGroupId = {
  '00000000000000000000000000000001': 'Friends',
  '00000000000000000000000000000002': 'Family',
  '00000000000000000000000000000003': 'Co-Workers',
  '00000000000000000000000000000004': 'Other Contacts',
  '00000000000000000000000000000005': 'Favorites',
};

function loadRsNodeGroupId() {
  rs.rsJsonApiRequest('/rsPeers/getGroupInfoList').then((res) => {
    const { groupInfoList } = res.body;
    groupInfoList.forEach((groupItem) => {
      if (!Object.prototype.hasOwnProperty.call(RsNodeGroupId, groupItem.id)) {
        RsNodeGroupId[groupItem.id] = groupItem.name;
      }
    });
  });
}

function calcIndividualFlags(shareFlagsVal) {
  const isAnonymousSearch = (shareFlagsVal & DIR_FLAGS_ANONYMOUS_SEARCH) !== 0;
  const isAnonymousDownload = (shareFlagsVal & DIR_FLAGS_ANONYMOUS_DOWNLOAD) !== 0;
  const isBrowsable = (shareFlagsVal & DIR_FLAGS_BROWSABLE) !== 0;
  return {
    isAnonymousSearch,
    isAnonymousDownload,
    isBrowsable,
  };
}

function calcShareFlagsValue(shareFlagsObj) {
  // calculate shareFlagsVal by performing OR operation on the Flags that have true value
  const shareFlagsVal =
    (shareFlagsObj.isAnonymousSearch && DIR_FLAGS_ANONYMOUS_SEARCH) |
    (shareFlagsObj.isAnonymousDownload && DIR_FLAGS_ANONYMOUS_DOWNLOAD) |
    (shareFlagsObj.isBrowsable && DIR_FLAGS_BROWSABLE);
  return shareFlagsVal;
}

const createArrayProxy = (arr, onChange) => {
  return new Proxy(arr, {
    set: (target, property, value, reciever) => {
      const success = Reflect.set(target, property, value, reciever);
      if (success && onChange) {
        onChange();
      }
      return success;
    },
  });
};

const createProxy = (obj, onChange) => {
  return new Proxy(obj, {
    get: (target, property, reciever) => {
      const value = Reflect.get(target, property, reciever);
      return typeof value === 'object' && value !== null
        ? Array.isArray(value)
          ? createArrayProxy(value, onChange)
          : createProxy(value, onChange)
        : value;
    },
    set: (target, property, value, reciever) => {
      const success = Reflect.set(target, property, value, reciever);
      if (success && onChange) {
        onChange();
      }
      return success;
    },
  });
};

function calcRemainingTime(bytes, rate) {
  if (rate <= 0 || bytes < 1) {
    return '--';
  } else {
    let secs = bytes / rate / 1024;
    if (secs < 60) {
      return secs.toFixed() + 's';
    }
    let mins = secs / 60;
    secs = secs - Math.floor(mins) * 60;
    if (mins < 60) {
      return mins.toFixed() + 'm ' + secs.toFixed() + 's';
    }
    let hours = mins / 60;
    mins = mins - Math.floor(hours) * 60;
    if (hours < 24) {
      return hours.toFixed() + 'h ' + mins.toFixed() + 'm';
    }
    const days = hours / 24;
    hours = hours - Math.floor(days) * 24;
    return days.toFixed() + 'd ' + hours.toFixed() + 'h';
  }
}

function fileAction(hash, action) {
  const jsonParams = {
    hash,
    flags: 0,
  };
  switch (action) {
    case 'pause':
      jsonParams.flags = RS_FILE_CTRL_PAUSE;
      break;

    case 'resume':
      jsonParams.flags = RS_FILE_CTRL_START;
      break;

    case 'force_check':
      jsonParams.flags = RS_FILE_CTRL_FORCE_CHECK;
      break;

    default:
      console.error('Unknown action in Downloads.control()');
      return;
  }
  rs.rsJsonApiRequest('/rsFiles/FileControl', jsonParams);
}

const ProgressBar = () => {
  return {
    view: (v) =>
      m('.progress-bar-chunks', [
        v.attrs.chunksInfo.chunks.map((item) => m(`span.chunk[data-chunkVal=${item}]`)),
        m('span.progress-bar-chunks__percent', v.attrs.rate.toPrecision(3) + '%'),
      ]),
  };
};

const File = () => {
  let chunkStrat;
  const chunkStrats = {
    // rstypes.h :: 366
    0: 'Sequential', // CHUNK_STRATEGY_SEQUENTIAL
    1: 'Random', // CHUNK_STRATEGY_RANDOM
    2: 'Progressive', // CHUNK_STRATEGY_PROGRESSIVE
    3: 'Streaming', // CHUNK_STRATEGY_STREAMING
  };
  function fileCancel(hash) {
    rs.rsJsonApiRequest('/rsFiles/FileCancel', { hash }).then((res) =>
      widget.popupMessage(m('p', `Download Cancel ${res ? 'Successful' : 'Failed'}`))
    );
  }
  function cancelFileDownload(hash) {
    widget.popupMessage([
      m('p', 'Are you sure you want to cancel download?'),
      m('button', { onclick: () => fileCancel(hash) }, 'Cancel'),
    ]);
  }
  function actionButton(file, action) {
    return m(
      'button',
      { title: action, onclick: () => fileAction(file.hash, action) },
      m(`i.fas.fa-${action === 'resume' ? 'play' : action}`)
    );
  }

  return {
    oninit: async (v) => {
      chunkStrat = await v.attrs.strategy;
    },
    view: (v) => {
      const { info, direction, transferred, chunksInfo } = v.attrs;
      function changeChunkStrategy(e) {
        chunkStrat = e.target.selectedIndex;
        rs.rsJsonApiRequest('/rsFiles/setChunkStrategy', {
          hash: info.hash,
          newStrategy: chunkStrat,
        });
      }
      return m('.file-view', { style: { display: info.isSearched ? 'block' : 'none' } }, [
        m('.file-view__heading', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' } }, [
          m('h6', info.fname),
          chunkStrat !== undefined &&
          direction === 'down' && [
            m('.file-view__heading-chunk', [
              m('label[for=chunkTag]', 'Set Chunk Strategy: '),
              m('select[id=chunkTag]', { value: chunkStrat, onchange: changeChunkStrategy }, [
                Object.keys(chunkStrats).map((strat) =>
                  m('option', { value: strat }, chunkStrats[strat])
                ),
              ]),
            ]),
          ],
        ]),
        m('.file-view__body', [
          m(
            '.file-view__body-progress',
            direction === 'down' &&
            m(ProgressBar, { rate: (transferred / info.size.xint64) * 100, chunksInfo })
          ),
          m('.file-view__body-details', [
            m('.file-view__body-details-stat', [
              m('span', { title: 'downloaded size' }, [
                m('i.fas.fa-download'),
                rs.formatBytes(transferred),
              ]),
              m('span', { title: 'total size' }, [
                m('i.fas.fa-file'),
                rs.formatBytes(info.size.xint64),
              ]),
              m('span', { title: 'speed' }, [
                m(`i.fas.fa-arrow-circle-${direction}`),
                `${rs.formatBytes(info.tfRate * 1024)}/s`,
              ]),
              direction === 'down' &&
              m('span', { title: 'time remaining' }, [
                m('i.fas.fa-clock'),
                calcRemainingTime(info.size.xint64 - transferred, info.tfRate),
              ]),
              m('span', { title: 'peers' }, [m('i.fas.fa-users'), info.peers.length]),
            ]),
            m(
              '.file-view__body-details-action',
              info.downloadStatus !== FT_STATE_COMPLETE && [
                actionButton(info, info.downloadStatus === FT_STATE_PAUSED ? 'resume' : 'pause'),
                m(
                  'button.red',
                  { title: 'cancel', onclick: () => cancelFileDownload(info.hash) },
                  m('i.fas.fa-times')
                ),
              ]
            ),
          ]),
        ]),
      ]);
    },
  };
};

const SearchBar = () => {
  let searchString = '';
  return {
    view: (v) =>
      m('input[type=text][placeholder=Search].searchbar', {
        value: searchString,
        oninput: (e) => {
          searchString = e.target.value.toLowerCase();
          for (const hash in v.attrs.list) {
            v.attrs.list[hash].isSearched =
              v.attrs.list[hash].fname.toLowerCase().indexOf(searchString) > -1;
          }
        },
      }),
  };
};

function compareArrays(big, small) {
  // Use filter on bigger array
  // Pass `new Set(array_to_compare)` as second param to filter
  // Source: https://stackoverflow.com/a/40538072/7683374
  return big.filter(function (val) {
    return !this.has(val);
  }, new Set(small));
}

const MyFilesTable = () => {
  return {
    view: (v) =>
      m('table.myfiles', [
        m('tr', [m('th', ''), m('th', 'My Directories'), m('th', 'Size')]),
        v.children,
      ]),
  };
};

const FriendsFilesTable = () => {
  return {
    view: (v) =>
      m('table.friendsfiles', [
        m('tr', [
          m('th', ''),
          m('th', 'Friends Directories'),
          m('th', 'Size'),
          m('th', m('i.fas.fa-download')),
        ]),
        v.children,
      ]),
  };
};

module.exports = {
  RS_FILE_CTRL_PAUSE,
  RS_FILE_CTRL_START,
  RS_FILE_CTRL_FORCE_CHECK,
  FT_STATE_FAILED,
  FT_STATE_OKAY,
  FT_STATE_WAITING,
  FT_STATE_DOWNLOADING,
  FT_STATE_COMPLETE,
  FT_STATE_QUEUED,
  FT_STATE_PAUSED,
  FT_STATE_CHECKING_HASH,
  RS_FILE_REQ_ANONYMOUS_ROUTING,
  RS_FILE_HINTS_REMOTE,
  RS_FILE_HINTS_LOCAL,
  DIR_FLAGS_ANONYMOUS_SEARCH,
  DIR_FLAGS_ANONYMOUS_DOWNLOAD,
  DIR_FLAGS_BROWSABLE,
  RsSharedDirectoriesEventCode,
  RsNodeGroupId,
  loadRsNodeGroupId,
  File,
  SearchBar,
  compareArrays,
  MyFilesTable,
  FriendsFilesTable,
  createProxy,
  calcIndividualFlags,
  calcShareFlagsValue,
};
 
}); 
require.register("files/friends_files", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const util = require('files/files_util');
const widget = require('widgets');
const fileDown = require('files/files_downloads');

function displayfiles() {
  const childrenList = []; // stores children details
  let loaded = false; // checks whether we have loaded the children details or not.
  let parStruct; // stores current struct(details, showChild)
  let isFile = false;
  let haveFile = false;
  let isId = false;
  let nameOfId;
  return {
    oninit: async (v) => {
      if (v.attrs.par_directory) {
        parStruct = v.attrs.par_directory;
        if (Number(parStruct.details.hash) !== 0) {
          isFile = true;
          const res = await rs.rsJsonApiRequest('/rsfiles/alreadyHaveFile', {
            // checks if the file is already there with the user
            hash: parStruct.details.hash,
          });
          haveFile = res.body.retval;
        }
      }
      if (v.attrs.replyDepth === 0 && parStruct) {
        isId = true;
        const res = await rs.rsJsonApiRequest('/rsPeers/getPeerDetails', {
          sslId: parStruct.details.name,
        });
        if (res.body.retval) {
          nameOfId = res.body.det.name;
        }
      }
    },
    view: (v) => [
      m('tr', [
        parStruct && parStruct.details.children && Object.keys(parStruct.details.children).length
          ? m(
              'td',
              m('i.fas.fa-angle-right', {
                class: 'fa-rotate-' + (parStruct.showChild ? '90' : '0'),
                style: 'margin-top:12px',
                onclick: async () => {
                  if (!loaded) {
                    // Retrieve the directory entries before displaying the nested rows.
                    const entries = await Promise.all(
                      parStruct.details.children.map(async (child) => {
                        const res = await rs.rsJsonApiRequest('/rsfiles/requestDirDetails', {
                          handle: child.handle.xint64,
                          flags: util.RS_FILE_HINTS_REMOTE,
                        });
                        return res.body.details;
                      })
                    );
                    childrenList.push(...entries);
                    loaded = true;
                  }
                  parStruct.showChild = !parStruct.showChild;
                  m.redraw();
                },
              })
            )
          : m('td', ''),
        m(
          'td',
          {
            style: {
              position: 'relative',
              '--replyDepth': v.attrs.replyDepth,
              left: `calc(30px*${v.attrs.replyDepth})`,
            },
          },
          [
            m('i.fas', {
              class: isId
                ? 'fa-user-friends friends-files__friend-icon'
                : !isFile
                  ? parStruct.showChild
                    ? 'fa-folder-open friends-files__folder-icon'
                    : 'fa-folder friends-files__folder-icon'
                  : 'fa-file friends-files__file-icon',
              title: isId ? 'Friend' : isFile ? 'File' : 'Folder',
              style: 'margin-right:0.45rem',
            }),
            isId
              ? (nameOfId || parStruct.details.name) +
                ' (' +
                parStruct.details.name.slice(0, 8) +
                '...)'
              : parStruct.details.name,
          ]
        ),
        m('td', rs.formatBytes(parStruct.details.size.xint64)),
        isFile &&
          m(
            'td',
            // using the file from files_util to display download.
            fileDown.list[parStruct.details.hash]
              ? m(util.File, {
                  info: fileDown.list[parStruct.details.hash],
                  direction: 'down',
                  transferred: fileDown.list[parStruct.details.hash].transfered.xint64,
                  parts: [],
                })
              : m(
                  'button',
                  {
                    style: { fontSize: '0.9em' },
                    onclick: async () => {
                      widget.popupMessage([
                        m('p', 'Start Download?'),
                        m(
                          'button',
                          {
                            onclick: async () => {
                              if (!haveFile) {
                                const res = await rs.rsJsonApiRequest('/rsFiles/FileRequest', {
                                  fileName: parStruct.details.name,
                                  hash: parStruct.details.hash,
                                  flags: util.RS_FILE_REQ_ANONYMOUS_ROUTING,
                                  size: {
                                    xstr64: parStruct.details.size.xstr64,
                                  },
                                });
                                res.body.retval === false
                                  ? widget.popupMessage([
                                      m('h3', 'Error'),
                                      m('hr'),
                                      m('p', res.body.errorMessage),
                                    ])
                                  : widget.popupMessage([
                                      m('h3', 'Success'),
                                      m('hr'),
                                      m('p', 'Download Started'),
                                    ]);
                                m.redraw();
                              }
                            },
                          },
                          'Start Download'
                        ),
                      ]);
                    },
                  },

                  haveFile ? 'Open File' : ['Download', m('i.fas.fa-download')]
                )
          ),
      ]),
      parStruct.showChild && // recursive call to show children
        childrenList.map((child) =>
          m(displayfiles, {
            par_directory: { details: child, showChild: false },
            replyDepth: v.attrs.replyDepth + 1,
          })
        ),
    ],
  };
}

const Layout = () => {
  let directories = [];
  return {
    oninit: async () => {
      const res = await rs.rsJsonApiRequest('/rsfiles/requestDirDetails', {
        flags: util.RS_FILE_HINTS_REMOTE,
      });
      const root = res.body.details;

      // The remote API returns a synthetic "root" directory.  It is not a
      // friend and only adds an unnecessary level to this view, so begin at
      // its children instead.
      if (root && root.name === 'root' && root.children) {
        directories = await Promise.all(
          root.children.map(async (child) => {
            const childRes = await rs.rsJsonApiRequest('/rsfiles/requestDirDetails', {
              handle: child.handle.xint64,
              flags: util.RS_FILE_HINTS_REMOTE,
            });
            return childRes.body.details;
          })
        );
      } else if (root) {
        directories = [root];
      }
      m.redraw();
    },
    view: () => [
      m('.widget__heading', [m('h3', 'Friends Files')]),
      m('.widget__body', [
        m(
          util.FriendsFilesTable,
          m(
            'tbody',
            directories.map((directory) =>
              m(displayfiles, {
                par_directory: { details: directory, showChild: false },
                replyDepth: 0,
              })
            )
          )
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("files/my_files", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const util = require('files/files_util');
const manager = require('files/files_manager');

const translateName = (name) => {
  const n = name.toLowerCase().trim();
  if (n === 'extra list' || n === '[extra list]') return 'Temporary shared files';
  // Match hex strings (IDs) or pure numeric strings
  if (/^[0-9a-fA-F]{16,}$/.test(name) || /^\d+$/.test(name)) return 'My Files';
  return name;
};

const DisplayFiles = () => {
  const childrenList = []; // stores children details
  let loaded = false; // checks whether we have loaded the children details or not.
  let parStruct; // stores current struct(details, showChild)
  return {
    oninit: (v) => {
      if (v.attrs.par_directory) {
        parStruct = v.attrs.par_directory;
      }
    },
    view: (v) => [
      m('tr', [
        parStruct && parStruct.details.children && parStruct.details.children.length
          ? m(
            'td',
            m('i.fas.fa-angle-right', {
              class: `fa-rotate-${parStruct.showChild ? '90' : '0'}`,
              style: 'margin-top: 0.5rem',
              onclick: async () => {
                if (!loaded) {
                  // if it is not already retrieved
                  const results = await Promise.all(
                    parStruct.details.children.map((child) =>
                      rs.rsJsonApiRequest('/rsfiles/requestDirDetails', {
                        handle: child.handle.xint64,
                        flags: util.RS_FILE_HINTS_LOCAL,
                      })
                    )
                  );
                  results.forEach((res) => {
                    if (res && res.body && res.body.details) {
                      childrenList.push(res.body.details);
                    }
                  });
                  loaded = true;
                }
                parStruct.showChild = !parStruct.showChild;
              },
            })
          )
          : m('td', ''),
        m(
          'td',
          {
            style: {
              position: 'relative',
              '--replyDepth': v.attrs.replyDepth,
              left: `calc(1.5rem*${v.attrs.replyDepth})`,
            },
          },
          [
            parStruct.details.children !== undefined
              ? m('i.fas', {
                  class: parStruct.showChild ? 'fa-folder-open' : 'fa-folder',
                  title: 'Folder',
                  style: 'margin-right: 0.45rem; color: #d69e2e;',
                })
              : null,
            translateName(parStruct.details.name || ''),
          ]
        ),
        m('td', rs.formatBytes((parStruct.details.size && parStruct.details.size.xint64) || 0)),
      ]),
      parStruct.showChild &&
      childrenList.map((child) =>
        m(DisplayFiles, {
          // recursive call
          par_directory: { details: child, showChild: false },
          replyDepth: v.attrs.replyDepth + 1,
        })
      ),
    ],
  };
};

const Layout = () => {
  let displayList = [];
  let isLoading = true;
  let showShareManager = false; // Retain original declaration

  return {
    oninit: () => {
      rs.rsJsonApiRequest('/rsfiles/requestDirDetails', {}).then(async (res) => {
        if (res && res.body && res.body.details) {
          if (res.body.details.name === 'root') {
            // Skip root and fetch full details for each child (Location ID, Extra list, etc)
            const results = await Promise.all(
              res.body.details.children.map((child) =>
                rs.rsJsonApiRequest('/rsfiles/requestDirDetails', {
                  handle: child.handle.xint64,
                  flags: util.RS_FILE_HINTS_LOCAL,
                })
              )
            );
            displayList = results.map((r) => r.body.details);
          } else {
            displayList = [res.body.details];
          }
        }
        isLoading = false;
        m.redraw();
      });
    },
    view: () => [
      m('.widget__heading', [
        m('h3', 'My Files'),
        m(
          'button.my-files__configure-shares',
          {
            onclick: () => (showShareManager = true),
            title: 'Configure shared directories',
            'aria-label': 'Configure shared directories',
          },
          [m('i.fas.fa-folder-plus'), m('span', 'Configure shared directories')]
        ),
      ]),
      m('.widget__body', [
        m(
          util.MyFilesTable,
          m(
            'tbody',
            isLoading
              ? m('tr', m('td[colspan=3]', 'Loading...'))
              : displayList.map((details) =>
                m(DisplayFiles, {
                  par_directory: { details, showChild: false },
                  replyDepth: 0,
                })
              )
          )
        ),
        m(
          '.shareManagerPopupOverlay#shareManagerPopup',
          { style: { display: showShareManager ? 'block' : 'none' } },
          m(
            '.shareManagerPopup',
            m(manager),
            m(
              'button.red.close-btn',
              { onclick: () => (showShareManager = false) },
              m('i.fas.fa-times')
            )
          )
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("forums/forums", function(exports, require, module) { 
const m = require('mithril');
const widget = require('widgets');
const rs = require('rswebui');
const util = require('forums/forums_util');
const viewUtil = require('forums/forum_view');
const peopleUtil = require('people/people_util');

const getForums = {
  All: [],
  Popular: [],
  Subscribed: [],
  MyForums: [],
  async load() {
    const res = await rs.rsJsonApiRequest('/rsgxsforums/getForumsSummaries');
    if (res && res.body && res.body.forums) {
      getForums.All = res.body.forums;
      getForums.Popular = getForums.All;
      getForums.Subscribed = getForums.All.filter(
        (forum) =>
          forum.mSubscribeFlags === util.GROUP_SUBSCRIBE_SUBSCRIBED ||
          forum.mSubscribeFlags === util.GROUP_MY_FORUM
      );
      getForums.MyForums = getForums.All.filter(
        (forum) => forum.mSubscribeFlags === util.GROUP_MY_FORUM
      );
    }
  },
};
const sections = {
  MyForums: require('forums/my_forums'),
  Subscribed: require('forums/subscribed_forums'),
  Popular: require('forums/popular_forums'),
  Other: require('forums/other_forums'),
};

const Layout = () => {
  let ownId;

  return {
    oninit: () => {
      rs.setBackgroundTask(getForums.load, 5000, () => {
        return m.route.get().includes('/forums');
      });
      peopleUtil.ownIds((data) => {
        ownId = data;
        for (let i = 0; i < ownId.length; i++) {
          if (Number(ownId[i]) === 0) {
            ownId.splice(i, 1);
          }
        }
        ownId.unshift(0);
      });
    },
    view: (vnode) =>
      m('.widget', [
        m('.top-heading', [
          vnode.attrs.pathInfo.tab === 'MyForums' &&
          m(
            'button',
            {
              onclick: () =>
                ownId &&
                util.popupmessage(
                  m(viewUtil.createforum, {
                    authorId: ownId,
                    onCreated: getForums.load,
                  }),
                  'create-forum-modal'
                ),
            },
            'Create Forum'
          ),
          m(util.SearchBar, {
            list: getForums.All,
          }),
        ]),
        Object.prototype.hasOwnProperty.call(vnode.attrs.pathInfo, 'mMsgId') // thread's view
          ? m(viewUtil.ThreadView, {
            msgId: vnode.attrs.pathInfo.mMsgId,
            forumId: vnode.attrs.pathInfo.mGroupId,
          })
          : Object.prototype.hasOwnProperty.call(vnode.attrs.pathInfo, 'mGroupId') // Forum's view
            ? m(viewUtil.ForumView, {
              id: vnode.attrs.pathInfo.mGroupId,
            })
            : m(sections[vnode.attrs.pathInfo.tab], {
              list: getForums[vnode.attrs.pathInfo.tab],
            }),
      ]),
  };
};

module.exports = {
  view: (vnode) => {
    return [
      m(widget.Sidebar, {
        tabs: Object.keys(sections),
        baseRoute: '/forums/',
        mobileDrawer: true,
      }),
      m('.node-panel', m(Layout, { pathInfo: vnode.attrs })),
    ];
  },
};
 
}); 
require.register("forums/forums_util", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const widget = require('widgets');

const GROUP_SUBSCRIBE_ADMIN = 0x01; // means: you have the admin key for this group
const GROUP_SUBSCRIBE_PUBLISH = 0x02; // means: you have the publish key for thiss group. Typical use: publish key in forums are shared with specific friends.
const GROUP_SUBSCRIBE_SUBSCRIBED = 0x04; // means: you are subscribed to a group, which makes you a source for this group to your friend nodes.
const GROUP_SUBSCRIBE_NOT_SUBSCRIBED = 0x08;
const GROUP_MY_FORUM = GROUP_SUBSCRIBE_ADMIN + GROUP_SUBSCRIBE_SUBSCRIBED + GROUP_SUBSCRIBE_PUBLISH;

const THREAD_UNREAD = 0x00000003;

const Data = {
  DisplayForums: {},
  Threads: {},
  ParentThreads: {},
  ParentThreadMap: {},
  loading: new Set(),
};

function getTimestampValue(ts) {
  if (!ts) return 0;
  if (typeof ts === 'object') {
    if (ts.xint64 !== undefined) return ts.xint64;
    if (ts.xstr64 !== undefined) return Number(ts.xstr64);
    return 0;
  }
  return ts;
}

function formatTimestamp(ts) {
  const val = getTimestampValue(ts);
  if (!val || val === 0) return '???';
  try {
    const localDate = new Date(val * 1000);
    const offset = localDate.getTimezoneOffset() * 60000;
    return new Date(localDate.getTime() - offset).toISOString().replace('T', ' ').slice(0, 16);
  } catch (e) {
    return 'Invalid Date';
  }
}

async function updatedisplayforums(keyid) {
  if (Data.loading.has(keyid)) return;
  Data.loading.add(keyid);

  try {
    const res1 = await rs.rsJsonApiRequest('/rsgxsforums/getForumsInfo', {
      forumIds: [keyid], // keyid: Forumid
    });
    if (res1 && res1.body && res1.body.retval && res1.body.forumsInfo && res1.body.forumsInfo.length > 0) {
      const forumInfo = res1.body.forumsInfo[0];
      Data.DisplayForums[keyid] = {
        // struct for a forum
        name: forumInfo.mMeta.mGroupName,
        author: forumInfo.mMeta.mAuthorId,
        isSearched: true,
        description: forumInfo.mDescription,
        isSubscribed:
          forumInfo.mMeta.mSubscribeFlags === GROUP_SUBSCRIBE_SUBSCRIBED ||
          forumInfo.mMeta.mSubscribeFlags === GROUP_MY_FORUM,
        activity: forumInfo.mMeta.mLastPost,
        created: forumInfo.mMeta.mPublishTs,
      };
      if (Data.Threads[keyid] === undefined) {
        Data.Threads[keyid] = {};
      }

      const res2 = await rs.rsJsonApiRequest('/rsgxsforums/getForumPostsHierarchy', {
        group: forumInfo,
      });

      if (res2 && res2.body && res2.body.vect) {
        const vect = res2.body.vect;
        // Index 0 is the root sentinel in GXS hierarchy
        const rootSentinel = vect[0];

        if (rootSentinel && rootSentinel.mChildren) {
          Data.ParentThreads[keyid] = {};
          rootSentinel.mChildren.forEach((topIndex) => {
            const EntryToThread = (entryIndex) => {
              const entry = vect[entryIndex];
              const replies = {};

              // Map ForumPostEntry to a structure compatible with the existing UI
              const meta = {
                mGroupId: keyid,
                mMsgId: entry.mMsgId,
                mOrigMsgId: entry.mMsgId,
                mThreadId: entry.mMsgId,
                mParentId:
                  entry.mParent !== 0
                    ? vect[entry.mParent].mMsgId
                    : '00000000000000000000000000000000',
                mAuthorId: entry.mAuthorId,
                mMsgName: entry.mTitle,
                mPublishTs: entry.mPublishTs,
                mMostRecentTsInThread: getTimestampValue(entry.mPublishTs),
                mMsgStatus: entry.mMsgStatus,
              };

              // Populate ParentThreadMap for compatibility
              if (meta.mParentId !== '00000000000000000000000000000000') {
                if (!Data.ParentThreadMap[meta.mParentId]) Data.ParentThreadMap[meta.mParentId] = {};
                Data.ParentThreadMap[meta.mParentId][meta.mMsgId] = meta;
              }

              const threadStruct = {
                thread: { mMeta: meta, mMsg: null },
                replies,
                showReplies: false,
              };

              // Add to flat map
              Data.Threads[keyid][meta.mMsgId] = threadStruct;

              if (entry.mChildren) {
                entry.mChildren.forEach((childIndex) => {
                  const childThread = EntryToThread(childIndex);
                  replies[childThread.thread.mMeta.mMsgId] = childThread;
                  const childTs = childThread.thread.mMeta.mMostRecentTsInThread || 0;
                  if (childTs > meta.mMostRecentTsInThread) meta.mMostRecentTsInThread = childTs;
                });
              }

              return threadStruct;
            };

            const topThread = EntryToThread(topIndex);
            Data.ParentThreads[keyid][topThread.thread.mMeta.mMsgId] = topThread.thread.mMeta;
          });
        }
      }
      m.redraw();
    }
  } catch (e) {
    console.error('[RS] Error updating forum display for:', keyid, e);
  } finally {
    Data.loading.delete(keyid);
    m.redraw(); // Final redraw just in case
  }
}

/**
 * Load the body (mMsg) of a single forum post on demand.
 * Returns a Promise that resolves to the body string, or null on failure.
 */
async function loadPostContent(forumId, msgId) {
  // If body is already loaded, return it immediately
  if (
    Data.Threads[forumId] &&
    Data.Threads[forumId][msgId] &&
    Data.Threads[forumId][msgId].thread.mMsg !== null
  ) {
    return Data.Threads[forumId][msgId].thread.mMsg;
  }

  try {
    const res = await rs.rsJsonApiRequest('/rsgxsforums/getForumContent', {
      forumId,
      msgsIds: [msgId],
    });
    if (res && res.body && res.body.retval && res.body.msgs && res.body.msgs.length > 0) {
      const body = res.body.msgs[0].mMsg;
      // Cache the body in the existing thread entry
      if (Data.Threads[forumId] && Data.Threads[forumId][msgId]) {
        Data.Threads[forumId][msgId].thread.mMsg = body;
      }
      m.redraw();
      return body;
    }
  } catch (e) {
    console.error('[RS] Error loading post content:', forumId, msgId, e);
  }
  return null;
}

const DisplayForumsFromList = () => {
  return {
    view: (v) =>
      m(
        'tr',
        {
          key: v.attrs.id,
          class:
            Data.DisplayForums[v.attrs.id] && Data.DisplayForums[v.attrs.id].isSearched
              ? ''
              : 'hidden',
          onclick: () => {
            m.route.set('/forums/:tab/:mGroupId', {
              tab: v.attrs.category,
              mGroupId: v.attrs.id,
            });
          },
        },
        [m('td', Data.DisplayForums[v.attrs.id] ? Data.DisplayForums[v.attrs.id].name : '')]
      ),
  };
};

const ForumSummary = () => {
  let keyid = {};
  return {
    oninit: (v) => {
      keyid = v.attrs.details.mGroupId;
      updatedisplayforums(keyid);
    },
    view: (v) => { },
  };
};

const ForumTable = () => {
  return {
    view: (v) => m('table.forums', [m('tr', [m('th', 'Forum Name')]), v.children]),
  };
};
const ThreadsTable = () => {
  return {
    oninit: (v) => { },
    view: (v) =>
      m('table.threads', [
        v.children,
      ]),
  };
};
const ThreadsReplyTable = () => {
  return {
    oninit: (v) => { },
    view: (v) =>
      m('table.threadreply', [
        v.children,
      ]),
  };
};

const SearchBar = () => {
  let searchString = '';
  return {
    view: (v) =>
      m('input[type=text][id=searchforum][placeholder=Search Subject].searchbar', {
        value: searchString,
        oninput: (e) => {
          searchString = e.target.value.toLowerCase();
          for (const hash in Data.DisplayForums) {
            if (Data.DisplayForums[hash].name.toLowerCase().indexOf(searchString) > -1) {
              Data.DisplayForums[hash].isSearched = true;
            } else {
              Data.DisplayForums[hash].isSearched = false;
            }
          }
        },
      }),
  };
};
function popupmessage(message, modalClass = '') {
  widget.popupMessage(message, modalClass);
}

module.exports = {
  Data,
  SearchBar,
  ForumSummary,
  DisplayForumsFromList,
  ForumTable,
  ThreadsTable,
  ThreadsReplyTable,
  popupmessage,
  updatedisplayforums,
  loadPostContent,
  getTimestampValue,
  formatTimestamp,
  GROUP_SUBSCRIBE_ADMIN,
  GROUP_SUBSCRIBE_NOT_SUBSCRIBED,
  GROUP_SUBSCRIBE_PUBLISH,
  GROUP_SUBSCRIBE_SUBSCRIBED,
  GROUP_MY_FORUM,
  THREAD_UNREAD,
};
 
}); 
require.register("forums/forum_view", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const util = require('forums/forums_util');
const peopleUtil = require('people/people_util');
const chatEmoji = require('chat/chat_emoji');
const { loadPostContent, getTimestampValue, formatTimestamp } = require('./forums_util');
const CIRCLE_PUBLIC = 1;
const CIRCLE_EXTERNAL = 2;

function createforum() {
  let title;
  let body;
  let identity;
  let circle = CIRCLE_PUBLIC;
  let circles = [];
  let selectedCircle;
  let enableModerators = false;
  let moderatorFilter = 'all';
  let moderatorSearch = '';
  const moderators = new Set();
  return {
    oninit: async (vnode) => {
      if (vnode.attrs.authorId) {
        identity = vnode.attrs.authorId[0];
      }
      const res = await rs.rsJsonApiRequest('/rsgxscircles/getCirclesSummaries');
      if (res.body.retval) {
        circles = res.body.circles || [];
        selectedCircle = circles[0];
      }
    },
    view: (vnode) => {
      const query = moderatorSearch.trim().toLowerCase();
      const identities = (rs.userList.users || [])
        .filter((item) => item && item.mGroupId)
        .filter((item) => moderatorFilter !== 'contacts' ||
          (rs.userList.userMap[item.mGroupId] && rs.userList.userMap[item.mGroupId].isContact))
        .filter((item) => !query || `${item.mGroupName} ${item.mGroupId}`.toLowerCase().includes(query))
        .sort((a, b) => (a.mGroupName || '').localeCompare(b.mGroupName || ''));
      return m('.widget.create-forum-form', [
        m('.create-forum-form__heading', [
          m('h3', 'Create Forum'),
          m('p', 'Set up the forum and choose its publishing permissions.'),
        ]),
        m('input.create-forum-form__title[type=text][placeholder=Forum title]', {
          oninput: (e) => (title = e.target.value),
        }),
        m('.create-forum-form__field', [
          m('label[for=forum-idtags]', 'Owner identity'),
          m('select.config-style-select[id=forum-idtags]', {
            value: identity,
            onchange: (e) => (identity = vnode.attrs.authorId[e.target.selectedIndex]),
          }, vnode.attrs.authorId && vnode.attrs.authorId.map((o) => m('option', { value: o },
            Number(o) === 0 ? 'No Signature' : `${rs.userList.username(o)} (${o.slice(0, 8)}...)`))),
        ]),
        m('.create-forum-form__field', [
          m('label[for=forum-distribution]', 'Message distribution'),
          m('select.config-style-select[id=forum-distribution]', {
            value: circle,
            onchange: (e) => (circle = e.target.value),
          }, [
            m('option', { value: CIRCLE_PUBLIC }, '\u{1F310}  Public'),
            m('option', { value: CIRCLE_EXTERNAL }, '\u25C9  Restricted to External Circle'),
          ]),
        ]),
        Number(circle) === CIRCLE_EXTERNAL && m('.create-forum-form__field', [
          m('label[for=forum-circle]', 'Circle'),
          m('select.config-style-select[id=forum-circle]', {
            value: selectedCircle && selectedCircle.mGroupId,
            onchange: (e) => (selectedCircle = circles.find((item) => item.mGroupId === e.target.value)),
          }, circles.length
            ? circles.map((item) => m('option', { value: item.mGroupId }, item.mGroupName))
            : m('option[disabled]', 'No circles available')),
        ]),
        m('.create-forum-form__moderators', [
          m('.create-forum-form__moderators-heading', [
            m('label.create-forum-form__moderators-toggle', [
              m('input[type=checkbox]', {
                checked: enableModerators,
                onchange: (e) => {
                  enableModerators = e.target.checked;
                  if (!enableModerators) {
                    moderators.clear();
                  }
                },
              }),
              m('span', 'Add moderators'),
            ]),
            enableModerators && m('span', `${moderators.size} selected`),
          ]),
          enableModerators && m('.create-forum-form__moderator-controls', [
            m('select.config-style-select[id=forum-moderator-filter]', {
              value: moderatorFilter,
              onchange: (e) => {
                moderatorFilter = e.target.value;
              },
            }, [
              m('option[value=all]', 'All identities'),
              m('option[value=contacts]', 'My contacts'),
            ]),
            m('.create-forum-form__search', [
              m('i.fas.fa-search'),
              m('input[id=forum-moderator-search][type=search][placeholder=Search identities]', {
                value: moderatorSearch,
                oninput: (e) => (moderatorSearch = e.target.value),
              }),
            ]),
            m('.create-forum-form__moderator-list', identities.length
              ? identities.map((item) => m('label.create-forum-form__moderator', [
              m('input[type=checkbox]', {
                checked: moderators.has(item.mGroupId),
                onchange: (e) => e.target.checked
                  ? moderators.add(item.mGroupId)
                  : moderators.delete(item.mGroupId),
              }),
              m(peopleUtil.UserAvatar, {
                firstLetter: (item.mGroupName || '?').slice(0, 1).toUpperCase(),
                identityId: item.mGroupId,
                size: 30,
                isSquare: true,
              }),
              m('span', [
                m('b', item.mGroupName || 'Unnamed identity'),
                m('small', item.mGroupId),
              ]),
              ]))
              : m('.create-forum-form__empty', query ? 'No matching identities' : 'No identities available')),
          ]),
        ]),
        m('textarea.create-forum-form__description[rows=5][placeholder=Describe your forum]', {
          oninput: (e) => (body = e.target.value),
          value: body,
        }),
        m('button.create-forum-form__submit',
          {
            onclick: async () => {
              const res = await rs.rsJsonApiRequest('/rsgxsforums/createForumV2', {
                name: title,
                description: body,
                ...(Number(identity) !== 0 && { authorId: identity }),
                moderatorsIds: enableModerators ? Array.from(moderators) : [],
                circleType: Number(circle),
                ...(Number(circle) === CIRCLE_EXTERNAL && selectedCircle && { circleId: selectedCircle.mGroupId }),
              });
              if (res.body.retval) {
                await util.updatedisplayforums(res.body.forumId);
                if (vnode.attrs.onCreated) await vnode.attrs.onCreated();
                m.redraw();
              }
              res.body.retval === false
                ? util.popupmessage([m('h3', 'Error'), m('hr'), m('p', res.body.errorMessage)])
                : util.popupmessage([
                  m('h3', 'Success'),
                  m('hr'),
                  m('p', 'Forum created successfully'),
                ]);
            },
          },
          'Create'
        ),
      ]);
    },
  };
}
const AddThread = () => {
  const MAX_GXS_MESSAGE_SIZE = 199000;
  let title = '';
  let body = '';
  let identity;
  let showEmojiPicker = false;
  let emojiCategory = 'Smileys';
  let showFilePanel = false;
  let isFullscreen = false;
  let filePath = '';
  let filePathNeedsPrefix = false;
  let fileHashing = false;
  let fileError = '';
  let closed = false;
  const attachments = [];
  const inlineImages = [];

  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pollFileHash = (localpath, attempt = 0) => {
    if (closed) return;
    rs.rsJsonApiRequest('/rsFiles/ExtraFileStatus', { localpath }, (data) => {
      if (closed) return;
      const info = data && data.retval && data.info;
      if (info && info.hash && info.hash !== '0000000000000000000000000000000000000000') {
        const size = Number(info.size && (info.size.xint64 || info.size.xstr64 || info.size)) || 0;
        if (!attachments.some((file) => file.hash === info.hash)) {
          attachments.push({ name: info.name, size, hash: info.hash });
        }
        fileHashing = false;
        filePath = '';
        showFilePanel = false;
        fileError = '';
        m.redraw();
      } else if (fileHashing && attempt < 120) {
        setTimeout(() => pollFileHash(localpath, attempt + 1), 500);
      } else {
        fileHashing = false;
        fileError = 'RetroShare could not hash this file. Check the full local path.';
        m.redraw();
      }
    });
  };

  const attachFile = () => {
    const localpath = filePath.trim();
    if (!localpath || filePathNeedsPrefix || fileHashing) return;
    fileHashing = true;
    fileError = '';
    rs.rsJsonApiRequest('/rsFiles/ExtraFileHash', {
      localpath,
      period: 86400 * 7,
      flags: 0,
    }, (data, success) => {
      if (success && data && data.retval) {
        pollFileHash(localpath);
      } else {
        fileHashing = false;
        fileError = 'Failed to start file hashing. Check the full local path.';
        m.redraw();
      }
    });
  };

  const addInlineImages = (files) => {
    Array.from(files || []).forEach((file) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      image.onload = () => {
        let width = image.naturalWidth;
        let height = image.naturalHeight;
        const scale = Math.min(1, 640 / width, 480 / height);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        let quality = .84;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 175000 && (quality > .35 || width > 160 || height > 120)) {
          if (quality > .35) {
            quality = Math.max(.35, quality - .08);
          } else {
            width = Math.max(160, Math.round(width * .82));
            height = Math.max(120, Math.round(height * .82));
            canvas.width = width;
            canvas.height = height;
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, width, height);
            context.drawImage(image, 0, 0, width, height);
          }
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        inlineImages.push({ name: file.name, dataUrl });
        URL.revokeObjectURL(objectUrl);
        m.redraw();
      };
      image.onerror = () => URL.revokeObjectURL(objectUrl);
      image.src = objectUrl;
    });
  };

  //  The GXS limit is expressed in bytes, not in JS characters: an accent is two
  //  bytes and an emoji four, while both count as one or two units of .length.
  //  With an emoji picker one click away, counting characters lets the composer
  //  accept a message the core then rejects.
  const byteLength = (value) => new TextEncoder().encode(value).length;

  const postBody = () => {
    const message = escapeHtml(body).replace(/\r?\n/g, '<br>');
    const images = inlineImages.map((file) =>
      `<p><img src="${file.dataUrl}" alt="${escapeHtml(file.name)}" style="max-width:100%;height:auto;border-radius:6px;"></p>`
    ).join('');
    const embedded = attachments.map((file) =>
      `<p><a href="retroshare://file?name=${encodeURIComponent(file.name)}&amp;size=${file.size}&amp;hash=${file.hash}">&#128206; ${escapeHtml(file.name)}</a> (${formatSize(file.size)})</p>`
    ).join('');
    return `${message}${images}${embedded}`;
  };

  const insertEmoji = (emoji) => {
    body += emoji;
    showEmojiPicker = false;
  };

  return {
    oninit: (vnode) => {
      if (vnode.attrs.authorId) {
        identity = vnode.attrs.authorId[0];
      }
    },
    onremove: () => {
      //  pollFileHash re-arms itself every 500 ms for up to a minute. Closing
      //  the composer has to stop it, or it keeps hashing and redrawing against
      //  a component that is no longer on screen.
      closed = true;
    },
    view: (vnode) => {
      //  Built once per pass: postBody() re-escapes the message and re-joins
      //  every base64 image, and it was called five times per render, on every
      //  global redraw, while the user types.
      const mBody = postBody();
      const bodySize = byteLength(mBody);

      return m('.widget.forum-thread-composer', [
        m('.forum-thread-composer__heading', [
          m('.forum-thread-composer__heading-copy', [
            m('h3', (vnode.attrs.parent_thread !== '') > 0 ? 'Add Reply' : 'Create New Thread'),
            m('p', (vnode.attrs.parent_thread !== '') > 0
              ? 'Write a reply and optionally include images or files.'
              : 'Start a discussion and optionally include images or files.'),
          ]),
          m('button.forum-thread-composer__fullscreen[type=button]', {
            title: isFullscreen ? 'Restore default size' : 'Fullscreen',
            'aria-label': isFullscreen ? 'Restore default size' : 'Fullscreen',
            onclick: (e) => {
              isFullscreen = !isFullscreen;
              const modal = e.currentTarget.closest('.modal-content');
              if (modal) modal.classList.toggle('is-fullscreen', isFullscreen);
            },
          }, m(`i.fas.${isFullscreen ? 'fa-compress' : 'fa-expand'}`)),
        ]),
        (vnode.attrs.parent_thread !== '') > 0
          ? m('.forum-thread-composer__reply', [m('b', 'Replying to: '), vnode.attrs.parent_thread])
          : '',
        m('input.forum-thread-composer__title[type=text][placeholder=Thread title]', {
          value: title,
          oninput: (e) => (title = e.target.value),
        }),
        m('.forum-thread-composer__field', [
          m('label[for=forum-thread-identity]', 'Publishing identity'),
          m('select.config-style-select[id=forum-thread-identity]', {
            value: identity,
            onchange: (e) => {
              identity = vnode.attrs.authorId[e.target.selectedIndex];
            },
          }, vnode.attrs.authorId && vnode.attrs.authorId.map((o) => m(
            'option',
            { value: o },
            Number(o) === 0 ? 'No Signature' : `${rs.userList.username(o)} (${o.slice(0, 8)}...)`
          ))),
        ]),
        m('.forum-thread-composer__editor', [
          m('textarea[rows=8][placeholder=Write your message...]', {
          oninput: (e) => (body = e.target.value),
          value: body,
          }),
          m('.forum-thread-composer__toolbar', [
            m('input[type=file][id=forum-thread-files]', {
              onchange: (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                  const fullPath = file.path;
                  const hasFullPath = fullPath && (fullPath.includes('/') || fullPath.includes('\\')) && fullPath !== file.name;
                  filePath = hasFullPath ? fullPath : file.name;
                  filePathNeedsPrefix = !hasFullPath;
                  showFilePanel = true;
                  fileError = '';
                }
                e.target.value = '';
              },
            }),
            m('input[type=file][id=forum-thread-images][accept=image/*][multiple]', {
              onchange: (e) => {
                addInlineImages(e.target.files);
                e.target.value = '';
              },
            }),
            m('button.forum-thread-composer__tool[type=button][title=Attach file][aria-label=Attach file]', {
              class: showFilePanel ? 'active' : '',
              onclick: () => (showFilePanel = !showFilePanel),
            }, m('i.fas.fa-paperclip')),
            m('button.forum-thread-composer__tool[type=button][title=Insert emoji][aria-label=Insert emoji]', {
              class: showEmojiPicker ? 'active' : '',
              onclick: () => (showEmojiPicker = !showEmojiPicker),
            }, m('i.fas.fa-smile')),
            m('label.forum-thread-composer__tool[for=forum-thread-images][title=Attach images][aria-label=Attach images]',
              m('i.fas.fa-image')
            ),
            showEmojiPicker && m('.forum-thread-composer__emoji-picker', [
              m('.forum-thread-composer__emoji-categories', chatEmoji.EMOJI_CATEGORIES.map((category) =>
                m('button[type=button]', {
                  class: category === emojiCategory ? 'active' : '',
                  title: category,
                  onclick: () => (emojiCategory = category),
                }, chatEmoji.EMOJI_ICONS[category])
              )),
              m('.forum-thread-composer__emoji-grid',
                (chatEmoji.EMOJI_DATA[emojiCategory] || []).map((emoji) =>
                  m('button[type=button]', { onclick: () => insertEmoji(emoji) }, emoji)
                )
              ),
            ]),
          ]),
          showFilePanel && m('.forum-thread-composer__file-panel', [
            m('div', [
              m('input[type=text][placeholder=Full local path to file]', {
                value: filePath,
                disabled: fileHashing,
                oninput: (e) => {
                  filePath = e.target.value;
                  filePathNeedsPrefix = false;
                  fileError = '';
                },
              }),
              m('label[for=forum-thread-files][title=Browse for file]', m('i.fas.fa-folder-open')),
              m('button[type=button]', {
                disabled: fileHashing || !filePath.trim() || filePathNeedsPrefix,
                onclick: attachFile,
              }, fileHashing ? [m('i.fas.fa-spinner.fa-spin'), ' Hashing...'] : 'Attach'),
            ]),
            filePathNeedsPrefix && m('small', [
              'The browser only returned the filename. Add its complete folder path before attaching.',
            ]),
            fileError && m('small.error-text', fileError),
          ]),
          inlineImages.length > 0 && m('.forum-thread-composer__inline-images',
            inlineImages.map((file, index) => m('.forum-thread-composer__inline-image', [
              m('img', { src: file.dataUrl, alt: file.name }),
              m('button[type=button][title=Remove inline image][aria-label=Remove inline image]', {
                onclick: () => inlineImages.splice(index, 1),
              }, m('i.fas.fa-times')),
            ]))
          ),
        ]),
        attachments.length > 0 && m('.forum-thread-composer__attachments', [
          m('.forum-thread-composer__attachments-heading', [
            m('i.fas.fa-paperclip'),
            m('span', `${attachments.length} attachment${attachments.length === 1 ? '' : 's'}`),
          ]),
          m('.forum-thread-composer__attachment-list', attachments.map((file, index) =>
            m('.forum-thread-composer__attachment', [
              m('i.fas.fa-file-alt'),
              m('span', [m('b', file.name), m('small', formatSize(file.size))]),
              m('button[type=button][title=Remove attachment][aria-label=Remove attachment]', {
                onclick: () => attachments.splice(index, 1),
              }, m('i.fas.fa-times')),
            ])
          )),
        ]),
        m('.forum-thread-composer__capacity', {
          class: bodySize > MAX_GXS_MESSAGE_SIZE ? 'is-over-limit' : '',
        }, bodySize > MAX_GXS_MESSAGE_SIZE
          ? `Message is ${bodySize - MAX_GXS_MESSAGE_SIZE} bytes too large.`
          : `${MAX_GXS_MESSAGE_SIZE - bodySize} bytes remaining after HTML conversion.`
        ),
        m('.forum-thread-composer__actions', m(
          'button[type=button]',
          {
            disabled: fileHashing || bodySize > MAX_GXS_MESSAGE_SIZE,
            onclick: async () => {
              if (!title.trim() || (!body.trim() && attachments.length === 0 && inlineImages.length === 0)) return;
              //  Rebuilt here rather than reused from the render: what is sent
              //  must be what the fields hold at the click, not what they held
              //  when the button was last drawn.
              const mBody = postBody();
              if (byteLength(mBody) > MAX_GXS_MESSAGE_SIZE) return;
              const res =
                (vnode.attrs.parent_thread !== '') > 0 // is it a reply or a new thread
                  ? await rs.rsJsonApiRequest('/rsgxsforums/createPost', {
                    forumId: vnode.attrs.forumId,
                    mBody,
                    title,
                    authorId: identity,
                    parentId: vnode.attrs.parentId,
                  })
                  : await rs.rsJsonApiRequest('/rsgxsforums/createPost', {
                    forumId: vnode.attrs.forumId,
                    mBody,
                    title,
                    authorId: identity,
                  });

              res.body.retval === false
                ? util.popupmessage([m('h3', 'Error'), m('hr'), m('p', res.body.errorMessage)])
                : util.popupmessage([
                  m('h3', 'Success'),
                  m('hr'),
                  m('p', 'Thread added successfully'),
                ]);
              util.updatedisplayforums(vnode.attrs.forumId);
              m.redraw();
            },
          },
          (vnode.attrs.parent_thread !== '') > 0 ? 'Add Reply' : 'Create Thread'
        )),
      ]);
    },
  };
};

// getTimestampValue and formatTimestamp are imported from forums_util.js

const ThreadView = () => {
  let ownId;
  return {
    showThread: '',
    oninit: (v) => {
      util.updatedisplayforums(v.attrs.forumId);
      peopleUtil.ownIds((data) => {
        ownId = data;
        for (let i = 0; i < ownId.length; i++) {
          if (Number(ownId[i]) === 0) {
            ownId.splice(i, 1);
          }
        }
      });
    },
    view: (v) => {
      const forumId = v.attrs.forumId;
      const msgId = v.attrs.msgId;
      const threadStruct = (util.Data.Threads[forumId] && util.Data.Threads[forumId][msgId]) ? util.Data.Threads[forumId][msgId] : null;

      if (!threadStruct) {
        return m('.forum-thread-view', [
          m(
            'a[title=Back]',
            {
              onclick: () => m.route.set('/forums/:tab/:mGroupId', {
                tab: m.route.param().tab,
                mGroupId: forumId,
              }),
            },
            m('i.fas.fa-arrow-left')
          ),
          m('h3', 'Loading...'),
        ]);
      }

      const meta = threadStruct.thread.mMeta;
      const unread = meta.mMsgStatus === util.THREAD_UNREAD;

      return m('.forum-thread-view', { key: msgId }, [
        m(
          'a[title=Back]',
          {
            onclick: () => m.route.set('/forums/:tab/:mGroupId', {
              tab: m.route.param().tab,
              mGroupId: forumId,
            }),
          },
          m('i.fas.fa-arrow-left')
        ),
        m('div.post-header', { style: { margin: '10px 0' } }, [
          m('div.date', { style: { color: '#888', fontSize: '0.9em' } }, formatTimestamp(meta.mPublishTs)),
          m('h4.title', { style: { margin: '5px 0', fontWeight: 'bold' } }, meta.mMsgName),
          m('div.author', { style: { fontStyle: 'italic', fontSize: '1em' } }, rs.userList.username(meta.mAuthorId)),
        ]),
        m('hr'),
        m('div.actions', { style: { marginBottom: '15px' } }, [
          m('button', {
            style: { marginRight: '10px' },
            onclick: () => util.popupmessage(m(AddThread, {
              parent_thread: meta.mMsgName,
              forumId,
              authorId: ownId,
              parentId: msgId,
            }), 'create-forum-thread-modal')
          }, 'Reply'),
          m('button', {
            onclick: async () => {
              const res = await rs.rsJsonApiRequest('/rsgxsforums/markRead', {
                messageId: { first: forumId, second: meta.mOrigMsgId },
                read: !unread,
              });
              if (res.body.retval) {
                util.updatedisplayforums(forumId);
                m.redraw();
              }
            }
          }, unread ? 'Mark Read' : 'Mark Unread'),
        ]),
        m('div.forum-post-content', {
          style: {
            width: '100%',
            backgroundColor: '#f9f9f9',
            padding: '15px',
            borderRadius: '5px',
            whiteSpace: 'pre-wrap', // Preserve line breaks
            wordBreak: 'break-word',
          }
        }, [
          threadStruct.thread.mMsg !== null
            ? m.trust(threadStruct.thread.mMsg)
            : (loadPostContent(forumId, msgId), m('p', 'Loading content...'))
        ]),
      ]);
    },
  };
};

const ForumView = () => {
  let ownId = '';
  return {
    oninit: (v) => {
      util.updatedisplayforums(v.attrs.id);
      peopleUtil.ownIds((data) => {
        ownId = data;
        for (let i = 0; i < ownId.length; i++) {
          if (Number(ownId[i]) === 0) {
            ownId.splice(i, 1);
          }
        }
      });
    },
    view: (v) => {
      const forumDetails = util.Data.DisplayForums[v.attrs.id] || {
        name: 'Loading...',
        isSubscribed: false,
        created: {},
        activity: {},
        author: '0',
        description: 'Loading...',
      };
      const allPosts = util.Data.Threads[v.attrs.id]
        ? Object.values(util.Data.Threads[v.attrs.id]).map((ts) => ts.thread.mMeta)
        : [];
      const fname = forumDetails.name;
      const fsubscribed = forumDetails.isSubscribed;
      const createDate = forumDetails.created;
      const lastActivity = forumDetails.activity;
      //  userMap holds {name, isContact} objects, so it must not be read
      //  directly into the view: username() is what turns an id into a string.
      let fauthor = 'Unknown';

      if (Number(forumDetails.author) === 0) {
        fauthor = 'No Contact Author';
      } else if (forumDetails.author) {
        fauthor = rs.userList.username(forumDetails.author);
      }

      return [
        m(
          'a[title=Back]',
          {
            onclick: () =>
              m.route.set('/forums/:tab', {
                tab: m.route.param().tab,
              }),
          },
          m('i.fas.fa-arrow-left')
        ),

        m('.widget__heading.forum-detail-heading', [
          m('h3', fname),
          m(
            'button',
            {
              onclick: async () => {
                const res = await rs.rsJsonApiRequest('/rsgxsforums/subscribeToForum', {
                  forumId: v.attrs.id,
                  subscribe: !fsubscribed,
                });
                if (res.body.retval) {
                  util.Data.DisplayForums[v.attrs.id].isSubscribed = !fsubscribed;
                }
              },
            },
            fsubscribed ? 'Subscribed' : 'Subscribe'
          ),
        ]),
        m('.forum-detail-card', [
          m('.forum-detail-card__icon[role=img][aria-label=Forum]',
            m('i.fas.fa-bullhorn')
          ),
          m('.forum-detail-card__details', [
            m('div', [m('b', 'Date created: '), m('span', formatTimestamp(createDate))]),
            m('div', [m('b', 'Admin: '), m('span', fauthor)]),
            m('div', [m('b', 'Last activity: '), m('span', formatTimestamp(lastActivity))]),
          ]),
          m('.forum-detail-card__description', [
            m('b', 'Description: '),
            m('span', forumDetails.description || 'No Description'),
          ]),
        ]),
        m(
          'threaddetails.forum-threads',
          {
            style: 'display:' + (fsubscribed ? 'block' : 'none'),
          },
          m('.forum-threads__heading', [
            m('h3', 'Threads'),
            m(
              'button.forum-threads__create[type=button][title=New Thread][aria-label=New Thread]',
              {
                onclick: () => {
                  util.popupmessage(
                    m(AddThread, {
                      parent_thread: '',
                      forumId: v.attrs.id,
                      authorId: ownId,
                      parentId: '',
                    }),
                    'create-forum-thread-modal'
                  );
                },
              },
              [m('i.fas.fa-pencil-alt'), m('span', 'New Thread')]
            ),
          ]),
          m(
            util.ThreadsTable,
            m(
              'tbody',
              allPosts
                .sort((a, b) => getTimestampValue(b.mPublishTs) - getTimestampValue(a.mPublishTs))
                .map((thread) =>
                  m(
                    'tr',
                    {
                      style:
                        thread.mMsgStatus === util.THREAD_UNREAD ? { fontWeight: 'bold' } : '',
                    },
                    m('td', { style: { padding: '10px 0' } }, [
                      m('div.date', { style: { fontSize: '0.8em', color: '#888' } },
                        formatTimestamp(thread.mPublishTs)
                      ),
                      m('div.title', {
                        style: { fontWeight: 'bold', fontSize: '1.2em', cursor: 'pointer', margin: '5px 0' },
                        onclick: () => {
                          m.route.set('/forums/:tab/:mGroupId/:mMsgId', {
                            tab: m.route.param().tab,
                            mGroupId: v.attrs.id,
                            mMsgId: thread.mOrigMsgId,
                          });
                        },
                      }, thread.mMsgName),
                      m('div.author', { style: { fontSize: '0.9em', fontStyle: 'italic' } }, rs.userList.username(thread.mAuthorId)),
                    ])
                  )
                )
            )
          )
        ),
      ];
    },
  };
};

module.exports = {
  ForumView,
  ThreadView,
  createforum,
};
 
}); 
require.register("forums/my_forums", function(exports, require, module) { 
const m = require('mithril');
const util = require('forums/forums_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'My Forums')),
      m('.widget__body', [
        m(
          util.ForumTable,
          m('tbody', [
            v.attrs.list.map((forum) =>
              m(util.ForumSummary, {
                details: forum,
                category: 'MyForums',
              })
            ),
            v.attrs.list.map((forum) =>
              m(util.DisplayForumsFromList, {
                id: forum.mGroupId,
                category: 'MyForums',
              })
            ),
          ])
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("forums/other_forums", function(exports, require, module) { 
const m = require('mithril');

const Layout = () => {
  return {
    view: () => [m('.widget__heading', m('h3', 'Other Forums'))],
  };
};

module.exports = Layout();
 
}); 
require.register("forums/popular_forums", function(exports, require, module) { 
const m = require('mithril');
const util = require('forums/forums_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Popular Forums')),
      m('.widget__body', [
        m(
          util.ForumTable,
          m('tbody', [
            v.attrs.list.map((forum) =>
              m(util.ForumSummary, {
                details: forum,
                category: 'Popular',
              })
            ),
            v.attrs.list.map((forum) =>
              m(util.DisplayForumsFromList, {
                id: forum.mGroupId,
                category: 'Popular',
              })
            ),
          ])
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("forums/subscribed_forums", function(exports, require, module) { 
const m = require('mithril');
const util = require('forums/forums_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Subscribed Forums')),
      m('.widget__body', [
        m(
          util.ForumTable,
          m('tbody', [
            v.attrs.list.map((forum) =>
              m(util.ForumSummary, {
                details: forum,
                category: 'Subscribed',
              })
            ),
            v.attrs.list.map((forum) =>
              m(util.DisplayForumsFromList, {
                id: forum.mGroupId,
                category: 'Subscribed',
              })
            ),
          ])
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("mail/mail_attachment", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const util = require('mail/mail_util');

const Layout = () => {
  const files = [];
  let viewChanged = false;

  return {
    oninit: (v) => {
      v.attrs.list.forEach(async (element) => {
        const res = await rs.rsJsonApiRequest('/rsMail/getMessage', {
          msgId: element.msgId,
        });
        if (res.body.retval) {
          res.body.msg.files.forEach((element) => {
            files.push({ ...element, from: res.body.msg.from, ts: res.body.msg.ts });
          });
        }
      });
    },
    view: (v) => [
      m('.widget__heading', [
        m('h3', 'Attachments'),
        m('.view-toggle', [
          m(
            '.mail-view',
            {
              onclick: () => (viewChanged = false),
              style: { backgroundColor: viewChanged ? '#fff' : '#019DFF' },
            },
            m('i.fas.fa-mail-bulk')
          ),
          m(
            '.attachment-view',
            {
              onclick: () => (viewChanged = true),
              style: { backgroundColor: viewChanged ? '#019DFF' : '#fff' },
            },
            m('i.fas.fa-file')
          ),
        ]),
      ]),
      m('.widget__body', [
        viewChanged
          ? m(util.AttachmentSection, {
              files,
            })
          : m(
              util.Table,
              m(
                'tbody',
                v.attrs.list.map((msg) =>
                  m(util.MessageSummary, {
                    key: msg.msgId,
                    details: msg,
                    category: 'attachment',
                  })
                )
              )
            ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("mail/mail_compose", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const widget = require('widgets');
const peopleUtil = require('people/people_util');
const chatEmoji = require('chat/chat_emoji');
const renderIdentityTooltip = require('mail/mail_identity_tooltip');

const UserAvatarsCache = {};
const RecipientDetailsCache = {};
const MAX_RECIPIENTS = 20;

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const Layout = () => {
  let showCc = false;
  let showBcc = false;
  const ownAvatars = {};
  let attachments = [];
  let showEmojiPicker = false;
  let emojiSearch = '';
  let emojiCategory = 'Smileys';
  let hoveredRecipient = null;

  function showRecipientTooltip(item, element) {
    hoveredRecipient = {
      id: item.mGroupId,
      name: item.mGroupName,
      rect: element.getBoundingClientRect(),
    };

    if (!RecipientDetailsCache[item.mGroupId]) {
      rs.rsJsonApiRequest('/rsIdentity/getIdDetails', { id: item.mGroupId }, (data) => {
        if (data && data.details) {
          RecipientDetailsCache[item.mGroupId] = data.details;
          UserAvatarsCache[item.mGroupId] = data.details.mAvatar;
          m.redraw();
        }
      });
    }
  }

  function renderRecipientTooltip() {
    if (!hoveredRecipient) return null;
    const details = RecipientDetailsCache[hoveredRecipient.id];
    if (!details) return null;

    return renderIdentityTooltip({
      details,
      gxsId: hoveredRecipient.id,
      name: hoveredRecipient.name,
      rect: hoveredRecipient.rect,
      overlapAnchor: true,
    });
  }

  const Data = {
    allUsers: [],
    ownId: [],
    subject: '',
    identity: null,
    bodyHtml: '',
    recipients: {
      to: {
        inputVal: '',
        inputList: [],
        sendList: [],
      },
      cc: {
        inputVal: '',
        inputList: [],
        sendList: [],
      },
      bcc: {
        inputVal: '',
        inputList: [],
        sendList: [],
      },
    },
  };

  function insertContentIntoMailBody(content) {
    const mailBody = document.querySelector('#composerMailBody');
    if (!mailBody) return;
    mailBody.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (mailBody.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        if (typeof content === 'string') {
          const temp = document.createElement('div');
          temp.innerHTML = content;
          const frag = document.createDocumentFragment();
          let node, lastNode;
          while ((node = temp.firstChild)) {
            lastNode = frag.appendChild(node);
          }
          range.insertNode(frag);
          if (lastNode) {
            range.setStartAfter(lastNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        } else if (content instanceof Node) {
          range.insertNode(content);
          range.setStartAfter(content);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        return;
      }
    }
    if (typeof content === 'string') {
      mailBody.innerHTML += content;
    } else if (content instanceof Node) {
      mailBody.appendChild(content);
    }
  }

  function insertEmoji(emoji) {
    insertContentIntoMailBody(document.createTextNode(emoji));
  }
  async function loadMailUserDetails(msgType, senderId, recipientList, isDirectMail, ccList) {
    Data.allUsers = await peopleUtil.sortUsers(rs.userList.users);

    // Wrap ownIds in a Promise
    const gxsIds = await new Promise((resolve) => {
      peopleUtil.ownIds((ids) => {
        resolve(ids || []);
      });
    });

    Data.ownId = gxsIds.filter((id) => id && id !== '0000000000000000' && Number(id) !== 0);

    Data.ownId.forEach((id) => {
      if (!ownAvatars[id]) {
        rs.rsJsonApiRequest(
          '/rsIdentity/getIdDetails',
          { id },
          (data) => {
            if (data?.details) {
              ownAvatars[id] = data.details.mAvatar;
            }
          }
        );
      }
    });

    // Fetch own Node GPG ID
    const netStatus = await new Promise((resolve) => {
      rs.rsJsonApiRequest('/rsConfig/getConfigNetStatus', {}, (res) => {
        resolve(res || null);
      });
    });

    if (netStatus && netStatus.status) {
      const ownNodeId = netStatus.status.ownId;
      if (ownNodeId && !Data.ownId.includes(ownNodeId)) {
        rs.userList.userMap[ownNodeId] = {
          name: (netStatus.status.ownName || 'Node') + ' (Node GPG Key)',
          isContact: false,
        };
        Data.ownId.push(ownNodeId);
      }
      if (msgType === 'compose' && isDirectMail) {
        Data.identity = ownNodeId;
      }
    }

    const resolvedSenderId = await senderId;

    if (msgType === 'reply' || msgType === 'replyAll') {
      Data.allUsers.forEach((user) => {
        if (user.mGroupId === resolvedSenderId) {
          Data.recipients.to.sendList.push(user);
          if (!UserAvatarsCache[resolvedSenderId]) {
            rs.rsJsonApiRequest(
              '/rsIdentity/getIdDetails',
              { id: resolvedSenderId },
              (data) => {
                if (data?.details) {
                  UserAvatarsCache[resolvedSenderId] = data.details.mAvatar;
                }
              }
            );
          }
        }
      });
    }

    if (msgType === 'replyAll') {
      // Add other "To" recipients
      if (recipientList) {
        Object.keys(recipientList).forEach((recip) => {
          if (recip !== resolvedSenderId && !Data.ownId.includes(recip)) {
            const user = Data.allUsers.find((u) => u.mGroupId === recip);
            if (user && !Data.recipients.to.sendList.some((item) => item.mGroupId === recip)) {
              Data.recipients.to.sendList.push(user);
              if (!UserAvatarsCache[recip]) {
                rs.rsJsonApiRequest(
                  '/rsIdentity/getIdDetails',
                  { id: recip },
                  (data) => {
                    if (data?.details) {
                      UserAvatarsCache[recip] = data.details.mAvatar;
                    }
                  }
                );
              }
            }
          }
        });
      }
      // Add other "Cc" recipients
      if (ccList) {
        Object.keys(ccList).forEach((recip) => {
          if (recip !== resolvedSenderId && !Data.ownId.includes(recip)) {
            const user = Data.allUsers.find((u) => u.mGroupId === recip);
            if (user && !Data.recipients.cc.sendList.some((item) => item.mGroupId === recip)) {
              Data.recipients.cc.sendList.push(user);
              if (!UserAvatarsCache[recip]) {
                rs.rsJsonApiRequest(
                  '/rsIdentity/getIdDetails',
                  { id: recip },
                  (data) => {
                    if (data?.details) {
                      UserAvatarsCache[recip] = data.details.mAvatar;
                    }
                  }
                );
              }
            }
          }
        });
      }
    }

    if (msgType === 'reply' || msgType === 'replyAll' || msgType === 'forward') {
      Data.identity = Data.ownId.filter((id) =>
        Object.prototype.hasOwnProperty.call(recipientList, id)
      )[0];
    }
  }
  async function loadDetails(attrs) {
    const { msgType, senderId, recipientList, ccList, isDirectMail } = await attrs;
    await loadMailUserDetails(msgType, senderId, recipientList, isDirectMail, ccList);

    Object.keys(Data.recipients).forEach((item) => {
      Data.recipients[item].inputList = Data.allUsers;
    });

    if (Data.recipients.cc.sendList.length > 0) showCc = true;
    if (Data.recipients.bcc.sendList.length > 0) showBcc = true;

    if (msgType === 'compose') {
      if (!isDirectMail) {
        Data.identity = Data.ownId[0];
      }
      if (attrs.toId) {
        const matchingUser = Data.allUsers.find((user) => user.mGroupId === attrs.toId);
        if (matchingUser) {
          Data.recipients.to.sendList.push(matchingUser);
        } else {
          // If toId is a GPG ID (not in GXS list), add it manually as a GPG recipient
          const friendName = attrs.friendName || 'Unknown Friend';
          Data.recipients.to.sendList.push({
            mGroupId: attrs.toId,
            mGroupName: friendName + ' (Node GPG Key)',
          });
        }
      }
    }

    if (msgType === 'reply' || msgType === 'replyAll' || msgType === 'forward') {
      const { subject, replyMessage, timeStamp } = await attrs;
      const tmb = document.querySelector('#composerMailBody');
      const time = timeStamp.toLocaleTimeString('UTC', { hour: '2-digit', minute: '2-digit' });
      const dateLong = timeStamp.toLocaleDateString('UTC', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const headerTitle = msgType === 'forward' ? 'Forwarded Message' : 'Original Message';
      const replyMessageHeader = `
        -----${headerTitle}-----
        <br>
        <b>From: </b>
        <a href="retroshare://message?id=${senderId}">${rs.userList.username(senderId)}</a>
        <br>
        <b>To: </b>
        ${recipientList ? Object.keys(recipientList).map(
          (recip) => `
          <a href="retroshare://message?id=${recip}">
             ${rs.userList.username(recipientList[recip]._addr_string) || 'Unknown'},
          </a>
        `
        ).join('') : ''}
        <br>
        <br>
        <b>Sent: </b>
        <span>${dateLong} ${time}</span>
        <br>
        <b>Subject: </b>
        <span>${subject}</span>
        <br>
        <br>
        ${msgType !== 'forward' ? `
        <span>
          On ${timeStamp.toLocaleDateString()} ${time},
           <a href="retroshare://message?id=${senderId}">${rs.userList.username(senderId)}</a>
          wrote:
        </span>
        ` : ''}
      `;
      const bodyHtml = `
        <br>
        <br>
        <div>
          ${replyMessageHeader}
          <div class="original-message" style="margin-left: 20px;">
            ${replyMessage}
          </div>
        </div>
      `;
      if (tmb) {
        tmb.innerHTML = bodyHtml;
      }
      Data.bodyHtml = bodyHtml;
      if (msgType === 'forward') {
        Data.subject = subject.substring(0, 5) === 'Fwd: ' ? subject : `Fwd: ${subject}`;
      } else {
        Data.subject = subject.substring(0, 4) === 'Re: ' ? subject : `Re: ${subject}`;
      }
    }
  }
  return {
    oninit: async (v) => await loadDetails(v.attrs),
    view: (v) => {
      // get recipientType from the function call to handle events for all recipient types
      function handleInput(e, recipientType) {
        Data.recipients[recipientType].inputVal = e.target.value;
        Data.recipients[recipientType].inputList = Data.allUsers.filter((item) =>
          item.mGroupName.toLowerCase().includes(e.target.value.toLowerCase())
        );
      }
      function totalRecipients() {
        return Data.recipients.to.sendList.length +
               Data.recipients.cc.sendList.length +
               Data.recipients.bcc.sendList.length;
      }
      function handleClick(item, recipientType) {
        if (totalRecipients() >= MAX_RECIPIENTS) return;
        Data.recipients[recipientType].sendList.push(item);
        if (item.mGroupId && !UserAvatarsCache[item.mGroupId]) {
          rs.rsJsonApiRequest(
            '/rsIdentity/getIdDetails',
            { id: item.mGroupId },
            (data) => {
              if (data?.details) {
                UserAvatarsCache[item.mGroupId] = data.details.mAvatar;
              }
            }
          );
        }
        // reset current input values after a sender is selected
        Data.recipients[recipientType].inputVal = '';
        Data.recipients[recipientType].inputList = Data.allUsers;
      }
      function removeSelectedItem(recipient, recipientType) {
        Data.recipients[recipientType].sendList = Data.recipients[recipientType].sendList.filter(
          (item) => item.mGroupId !== recipient.mGroupId
        );
      }
      function sendMail() {
        // Auto-add inputVal if user typed recipient but didn't click dropdown item
        ['to', 'cc', 'bcc'].forEach((type) => {
          const val = Data.recipients[type].inputVal ? Data.recipients[type].inputVal.trim() : '';
          if (val) {
            const match = Data.allUsers.find((u) => u.mGroupName && (u.mGroupName.toLowerCase() === val.toLowerCase() || u.mGroupId === val));
            if (match && !Data.recipients[type].sendList.some((item) => item.mGroupId === match.mGroupId)) {
              Data.recipients[type].sendList.push(match);
            } else if (!match && val.length > 5) {
              Data.recipients[type].sendList.push({ mGroupId: val, mGroupName: val });
            }
            Data.recipients[type].inputVal = '';
          }
        });

        const to = Data.recipients.to.sendList.map((toItem) => toItem.mGroupId);
        const cc = Data.recipients.cc.sendList.map((ccItem) => ccItem.mGroupId);
        const bcc = Data.recipients.bcc.sendList.map((bccItem) => bccItem.mGroupId);

        let from = Data.identity;
        if (!from && Data.ownId && Data.ownId.length > 0) {
          from = Data.ownId[0];
          Data.identity = from;
        }

        if (to.length === 0) {
          widget.popupMessage(
            m('.widget', [
              m('.widget__heading', m('h3', 'Missing Recipient')),
              m('.widget__body', m('p', 'Please select at least one recipient in the "To" field.')),
            ])
          );
          return;
        }

        if (!from) {
          widget.popupMessage(
            m('.widget', [
              m('.widget__heading', m('h3', 'Missing Identity')),
              m('.widget__body', m('p', 'Please select a "From" identity.')),
            ])
          );
          return;
        }

        const subject = Data.subject || '(No Subject)';
        const mailBodyElement = document.querySelector('#composerMailBody');
        let fullMailBody = mailBodyElement ? mailBodyElement.innerHTML : '';

        if (attachments.length > 0) {
          const attHtml = `
            <br/><hr style="border:none;border-top:1px solid #e2e8f0;margin:1rem 0;"/><div style="margin-top:10px;font-weight:bold;color:#475569;font-size:0.9rem;">Attachments (${attachments.length}):</div>
            <ul style="list-style:none;padding:0;margin:6px 0;">
              ${attachments.map((att) => `<li style="padding:4px 0;color:#1e293b;font-size:0.875rem;">📎 <b>${att.name}</b> <span style="color:#94a3b8;font-size:0.8em;">(${att.size})</span></li>`).join('')}
            </ul>
          `;
          fullMailBody += attHtml;
        }

        const mailBody = `<div>${fullMailBody}</div>`;

        rs.rsJsonApiRequest('/rsMail/sendMail', { from, subject, mailBody, to, cc, bcc }, (data, success) => {
          const isOk = success && data && (
            data.retval > 0 ||
            data.retval === true ||
            (Array.isArray(data.trackingIds) && data.trackingIds.length > 0)
          );
          if (isOk) {
            Object.keys(Data.recipients).forEach((recipientType) => {
              Data.recipients[recipientType].sendList = [];
            });
            Data.subject = '';
            if (mailBodyElement) mailBodyElement.innerHTML = '';
            attachments = [];
            v.attrs.setShowCompose(false);
          }
          widget.popupMessage(
            m('.widget', [
              m('.widget__heading', m('h3', isOk ? 'Success' : 'Error')),
              m('.widget__body', m('p', isOk ? 'Mail sent successfully' : (data?.errorMsg || data?.errorMessage || 'Failed to send mail'))),
            ])
          );
          m.redraw();
        });
      }
      return m('.widget', [
        m('.widget__heading', m('h3', 'Compose a mail')),
        m('.widget__body.compose-mail', [
          m('.compose-mail__from', [
            m('label[for=idtags].bold', 'From: '),
            Data.identity && m(peopleUtil.UserAvatar, {
              avatar: ownAvatars[Data.identity],
              firstLetter: rs.userList.userMap[Data.identity] && typeof rs.userList.userMap[Data.identity] === 'string'
                ? rs.userList.userMap[Data.identity].slice(0, 1).toUpperCase()
                : (rs.userList.username(Data.identity) || '').slice(0, 1).toUpperCase(),
              identityId: Data.identity,
              size: 24,
            }),
            m(
              'select[id=idtags]',
              {
                value: Data.identity,
                onchange: (e) => {
                  Data.identity = Data.ownId[e.target.selectedIndex];
                },
              },
               Data.ownId &&
                Data.ownId.map((id) =>
                  m(
                    'option',
                    {
                      value: id,
                      selected: id === Data.identity,
                    },
                    rs.userList.userMap[id]
                      ? (rs.userList.userMap[id].name || id) + ' (' + id.slice(0, 12) + '...)'
                      : 'No Signature'
                  )
                )
            ),
          ]),
          m('.compose-mail__recipients', [
            m('.compose-mail__recipients__container', [
              m('label.bold', 'To: '),
              m('.recipients', [
                Data.recipients.to.sendList.length > 0 &&
                  Data.recipients.to.sendList.map((recipient) =>
                    m('.recipients__selected', [
                      m(peopleUtil.UserAvatar, {
                        avatar: UserAvatarsCache[recipient.mGroupId],
                        firstLetter: recipient.mGroupName ? recipient.mGroupName.slice(0, 1).toUpperCase() : '',
                        identityId: recipient.mGroupId,
                        size: 20,
                      }),
                      m('span', recipient.mGroupName),
                      m('i.fas.fa-times', {
                        onclick: () => removeSelectedItem(recipient, 'to'),
                      }),
                    ])
                  ),
                m('.recipients__input', [
                  m('input[type=text].recipients__input-field', {
                    value: Data.recipients.to.inputVal,
                    oninput: (e) => handleInput(e, 'to'),
                    placeholder: totalRecipients() >= MAX_RECIPIENTS
                      ? 'Max recipients reached'
                      : Data.recipients.to.sendList.length === 0
                        ? 'Recipients'
                        : '',
                    disabled: totalRecipients() >= MAX_RECIPIENTS,
                  }),
                  m('ul.recipients__input-list[autocomplete=off]', [
                    Data.recipients.to.inputList.length > 0
                      ? Data.recipients.to.inputList.map((item) =>
                          m('li', {
                            onclick: () => handleClick(item, 'to'),
                            onmouseenter: (event) => showRecipientTooltip(item, event.currentTarget),
                            onmouseleave: () => (hoveredRecipient = null),
                          }, item.mGroupName)
                        )
                      : m('li', 'No Item'),
                  ]),
                ]),
              ]),
              m('.compose-mail__recipients__toggles', {
                style: {
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center',
                  marginLeft: 'auto',
                  paddingRight: '0.5rem',
                  userSelect: 'none',
                }
              }, [
                m('span.bold', {
                  style: { cursor: 'pointer', color: showCc ? '#019DFF' : '#555' },
                  onclick: () => showCc = !showCc
                }, 'Cc'),
                m('span.bold', {
                  style: { cursor: 'pointer', color: showBcc ? '#019DFF' : '#555' },
                  onclick: () => showBcc = !showBcc
                }, 'Bcc')
              ])
            ]),
            ['cc', 'bcc'].map((recipientType) => {
              const isVisible = recipientType === 'cc' ? showCc : showBcc;
              return isVisible && m('.compose-mail__recipients__container', [
                m('label.bold', `${recipientType}: `),
                m('.recipients', [
                  Data.recipients[recipientType].sendList.length > 0 &&
                    Data.recipients[recipientType].sendList.map((recipient) =>
                      m('.recipients__selected', [
                        m(peopleUtil.UserAvatar, {
                          avatar: UserAvatarsCache[recipient.mGroupId],
                          firstLetter: recipient.mGroupName ? recipient.mGroupName.slice(0, 1).toUpperCase() : '',
                          identityId: recipient.mGroupId,
                          size: 20,
                        }),
                        m('span', recipient.mGroupName),
                        m('i.fas.fa-times', {
                          onclick: () => removeSelectedItem(recipient, recipientType),
                        }),
                      ])
                    ),
                  m('.recipients__input', [
                    m('input[type=text].recipients__input-field', {
                      value: Data.recipients[recipientType].inputVal,
                      oninput: (e) => handleInput(e, recipientType),
                      placeholder: totalRecipients() >= MAX_RECIPIENTS ? 'Max recipients reached' : '',
                      disabled: totalRecipients() >= MAX_RECIPIENTS,
                    }),
                    m('ul.recipients__input-list[autocomplete=off]', [
                      Data.recipients[recipientType].inputList.length > 0
                        ? Data.recipients[recipientType].inputList.map((item) =>
                            m(
                              'li',
                              {
                                onclick: () => handleClick(item, recipientType),
                                onmouseenter: (event) => showRecipientTooltip(item, event.currentTarget),
                                onmouseleave: () => (hoveredRecipient = null),
                              },
                              item.mGroupName
                            )
                          )
                        : m('li', 'No Item'),
                    ]),
                  ]),
                ]),
              ]);
            }),
            totalRecipients() >= MAX_RECIPIENTS && m('.compose-mail__recipient-limit', {
              style: { color: '#e67e22', fontSize: '0.85rem', padding: '0.25rem 0' }
            }, `Maximum of ${MAX_RECIPIENTS} recipients reached. Remove a recipient to add more.`),
            renderRecipientTooltip(),
          ]),
          m('input.compose-mail__subject[type=text][placeholder=Subject]', {
            value: Data.subject,
            oninput: (e) => (Data.subject = e.target.value),
          }),

          // Hidden File Inputs
          m('input#mail-file-attach[type=file]', {
            style: 'display: none;',
            multiple: true,
            onchange: (e) => {
              const files = Array.from(e.target.files || []);
              files.forEach((file) => {
                attachments.push({
                  name: file.name,
                  size: formatFileSize(file.size),
                  type: file.type,
                  rawFile: file,
                });
              });
              e.target.value = '';
              m.redraw();
            },
          }),
          m('input#mail-image-attach[type=file]', {
            style: 'display: none;',
            accept: 'image/*',
            onchange: (e) => {
              const file = e.target.files && e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  const src = event.target.result;
                  insertContentIntoMailBody(`<img src="${src}" style="max-width: 100%; max-height: 400px; border-radius: 0.375rem; margin: 0.5rem 0;" />`);
                };
                reader.readAsDataURL(file);
              }
              e.target.value = '';
              m.redraw();
            },
          }),

          // File Attachments Bar
          attachments.length > 0 &&
            m('.mail-attachments-bar', {
              style: 'margin: 0.5rem 0; padding: 0.5rem 0.75rem; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 0.375rem; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;'
            }, [
              m('span', { style: 'font-weight: 600; font-size: 0.85rem; color: #475569; display: flex; align-items: center; gap: 0.35rem; margin-right: 0.25rem;' }, [
                m('i.fas.fa-paperclip', { style: 'color: #019DFF;' }),
                `Attachments (${attachments.length}):`
              ]),
              attachments.map((att, index) =>
                m('.mail-attachment-chip', {
                  style: 'display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.25rem 0.65rem; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 1rem; font-size: 0.825rem; font-weight: 500; color: #1e293b; box-shadow: 0 1px 2px rgba(0,0,0,0.05);'
                }, [
                  m('i.fas.fa-file-alt', { style: 'color: #3b82f6;' }),
                  m('span', att.name),
                  m('span', { style: 'color: #94a3b8; font-size: 0.75rem;' }, `(${att.size})`),
                  m('i.fas.fa-times', {
                    style: 'cursor: pointer; color: #ef4444; margin-left: 0.2rem; font-size: 0.8rem;',
                    onclick: () => attachments.splice(index, 1),
                  })
                ])
              )
            ]),

          m('.compose-mail__message', [
            m('.compose-mail__message-body[placeholder=Message][contenteditable]#composerMailBody', {
              oncreate: (vnode) => {
                if (Data.bodyHtml) {
                  vnode.dom.innerHTML = Data.bodyHtml;
                }
              }
            }),

            // Modern Mail Composer Bottom Toolbar
            m('.mail-compose-toolbar', {
              style: 'display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: #ffffff; border: 1px solid #cbd5e1; border-top: 1px solid #e2e8f0; border-radius: 0 0 0.375rem 0.375rem; position: relative;'
            }, [
              m('.toolbar-left', { style: 'display: flex; align-items: center; gap: 0.5rem;' }, [
                m('button.mail-compose-send-btn', {
                  style: 'display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 1.25rem; background: #019DFF; color: #ffffff; border: none; border-radius: 1.5rem; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: background 0.15s ease; box-shadow: 0 2px 4px rgba(1,157,255,0.25);',
                  onclick: sendMail,
                }, [
                  m('span', 'Send'),
                  m('i.fas.fa-paper-plane', { style: 'font-size: 0.85rem;' }),
                ]),
                m('.toolbar-divider', { style: 'width: 1px; height: 22px; background: #cbd5e1; margin: 0 0.25rem;' }),
                m('button.mail-tool-btn', {
                  type: 'button',
                  title: 'Attach files',
                  style: 'width: 34px; height: 34px; border-radius: 50%; border: none; background: transparent; color: #475569; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s ease;',
                  onmouseenter: (e) => (e.currentTarget.style.background = '#f1f5f9'),
                  onmouseleave: (e) => (e.currentTarget.style.background = 'transparent'),
                  onclick: () => {
                    const input = document.getElementById('mail-file-attach');
                    if (input) input.click();
                  },
                }, m('i.fas.fa-paperclip', { style: 'font-size: 1.05rem;' })),
                m('button.mail-tool-btn', {
                  type: 'button',
                  title: 'Insert image',
                  style: 'width: 34px; height: 34px; border-radius: 50%; border: none; background: transparent; color: #475569; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s ease;',
                  onmouseenter: (e) => (e.currentTarget.style.background = '#f1f5f9'),
                  onmouseleave: (e) => (e.currentTarget.style.background = 'transparent'),
                  onclick: () => {
                    const input = document.getElementById('mail-image-attach');
                    if (input) input.click();
                  },
                }, m('i.fas.fa-image', { style: 'font-size: 1.05rem;' })),
                m('button.mail-tool-btn', {
                  type: 'button',
                  title: 'Insert emoji',
                  style: `width: 34px; height: 34px; border-radius: 50%; border: none; background: ${showEmojiPicker ? '#e0f2fe' : 'transparent'}; color: ${showEmojiPicker ? '#0284c7' : '#475569'}; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s ease;`,
                  onclick: () => (showEmojiPicker = !showEmojiPicker),
                }, m('i.fas.fa-smile', { style: 'font-size: 1.05rem;' })),
              ]),

              // Floating Emoji Picker Popover
              showEmojiPicker && m('.mail-emoji-picker-popover', {
                style: 'position: absolute; bottom: 50px; left: 130px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 0.5rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1); width: 320px; max-height: 340px; z-index: 2000; display: flex; flex-direction: column; overflow: hidden;',
                onclick: (e) => e.stopPropagation(),
              }, [
                m('.emoji-search-bar', { style: 'padding: 0.5rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 0.5rem;' }, [
                  m('i.fas.fa-search', { style: 'color: #94a3b8; font-size: 0.85rem;' }),
                  m('input[type=text][placeholder=Search emoji...]', {
                    style: 'border: none; outline: none; width: 100%; font-size: 0.85rem;',
                    value: emojiSearch,
                    oninput: (e) => (emojiSearch = e.target.value),
                  }),
                  emojiSearch && m('i.fas.fa-times', {
                    style: 'cursor: pointer; color: #94a3b8; font-size: 0.85rem;',
                    onclick: () => (emojiSearch = ''),
                  }),
                ]),
                !emojiSearch && m('.emoji-cat-bar', { style: 'display: flex; background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 0.25rem; overflow-x: auto;' },
                  chatEmoji.EMOJI_CATEGORIES.map((c) =>
                    m('button', {
                      style: `border: none; background: ${c === emojiCategory ? '#ffffff' : 'transparent'}; border-radius: 0.25rem; padding: 0.3rem 0.4rem; cursor: pointer; font-size: 1rem; box-shadow: ${c === emojiCategory ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'};`,
                      title: c,
                      onclick: () => (emojiCategory = c),
                    }, chatEmoji.EMOJI_ICONS[c])
                  )
                ),
                m('.emoji-grid-body', { style: 'padding: 0.5rem; display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.25rem; max-height: 230px; overflow-y: auto;' },
                  (emojiSearch
                    ? Object.values(chatEmoji.EMOJI_DATA).flat().filter((e) => e.includes(emojiSearch))
                    : (chatEmoji.EMOJI_DATA[emojiCategory] || [])
                  ).map((e) =>
                    m('button', {
                      style: 'border: none; background: transparent; font-size: 1.25rem; cursor: pointer; padding: 0.25rem; border-radius: 0.25rem; transition: background 0.15s ease;',
                      onmouseenter: (ev) => (ev.currentTarget.style.background = '#f1f5f9'),
                      onmouseleave: (ev) => (ev.currentTarget.style.background = 'transparent'),
                      onclick: () => {
                        insertEmoji(e);
                        showEmojiPicker = false;
                      },
                    }, e)
                  )
                ),
              ])
            ]),
          ]),
        ]),
      ]);
    },
  };
};

module.exports = Layout;
 
}); 
require.register("mail/mail_draftbox", function(exports, require, module) { 
const m = require('mithril');

const util = require('mail/mail_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Draft')),
      m('.widget__body', [
        m(
          util.Table,
          m(
            'tbody',
            v.attrs.list.map((msg) =>
              m(util.MessageSummary, {
                details: msg,
                category: 'drafts',
              })
            )
          )
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("mail/mail_identity_tooltip", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const peopleUtil = require('people/people_util');

function renderIdentityTooltip({ details, gxsId, name, rect, overlapAnchor = false }) {
  if (!details || !rect) return null;

  const avatar = details.mAvatar && details.mAvatar.base64 ? details.mAvatar.base64 : details.mAvatar;
  const votes = details.mReputation
    ? (details.mReputation.mFriendsPositiveVotes || 0) -
      (details.mReputation.mFriendsNegativeVotes || 0)
    : 0;
  const tooltipWidth = 280;
  const gap = 10;
  let left = overlapAnchor ? rect.left + 90 : rect.right + gap;
  if (left + tooltipWidth > window.innerWidth - gap) left = rect.left - tooltipWidth - gap;
  if (left < gap) left = gap;
  let top = overlapAnchor ? rect.top - 10 : rect.top;
  if (top + 160 > window.innerHeight) top = window.innerHeight - 170;
  if (top < gap) top = gap;

  return m('.user-tooltip', { style: { top: `${top}px`, left: `${left}px` } }, [
    m('.tooltip-avatar', m(peopleUtil.UserAvatar, {
      avatar,
      firstLetter: (name || '?').slice(0, 1).toUpperCase(),
      identityId: gxsId,
      size: 56,
      isSquare: true,
    })),
    m('.tooltip-details', [
      m('.tooltip-row', [m('span.tooltip-label', 'Identity name: '), m('span.tooltip-value', name)]),
      m('.tooltip-row', [m('span.tooltip-label', 'Identity Id: '), m('span.tooltip-value.tooltip-id', gxsId)]),
      details.mPgpId && details.mPgpId !== '0000000000000000' && m('.tooltip-row', [
        m('span.tooltip-label', 'Node: '),
        m('span.tooltip-value', `${rs.userList.username(details.mPgpId) || name} [${details.mPgpId}]`),
      ]),
      m('.tooltip-row', [
        m('span.tooltip-label', 'Votes: '),
        m('span.tooltip-value', {
          style: { color: votes >= 0 ? '#008000' : '#cc0000', fontWeight: 'bold' },
        }, `${votes >= 0 ? '+' : ''}${votes}`),
      ]),
    ]),
  ]);
}

module.exports = renderIdentityTooltip;
 
}); 
require.register("mail/mail_important", function(exports, require, module) { 
const m = require('mithril');
const util = require('mail/mail_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Important')),
      m('.widget__body', [
        m(
          util.Table,
          m(
            'tbody',
            v.attrs.list.map((msg) =>
              m(util.MessageSummary, {
                details: msg,
                category: 'important',
              })
            )
          )
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("mail/mail_inbox", function(exports, require, module) { 
const m = require('mithril');
const util = require('mail/mail_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Inbox')),
      m('.widget__body', [
        m(
          util.Table,
          m(
            'tbody',
            v.attrs.list.map((msg) =>
              m(util.MessageSummary, {
                details: msg,
                category: 'inbox',
              })
            )
          )
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("mail/mail_later", function(exports, require, module) { 
const m = require('mithril');
const util = require('mail/mail_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Later')),
      m('.widget__body', [
        m(
          util.Table,
          m(
            'tbody',
            v.attrs.list.map((msg) =>
              m(util.MessageSummary, {
                details: msg,
                category: 'later',
              })
            )
          )
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("mail/mail_outbox", function(exports, require, module) { 
const m = require('mithril');
const util = require('mail/mail_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Outbox')),
      m('.widget__body', [
        m(
          util.Table,
          m(
            'tbody',
            v.attrs.list.map((msg) =>
              m(util.MessageSummary, {
                details: msg,
                category: 'outbox',
              })
            )
          )
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("mail/mail_personal", function(exports, require, module) { 
const m = require('mithril');
const util = require('mail/mail_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Personal')),
      m('.widget__body', [
        m(
          util.Table,
          m(
            'tbody',
            v.attrs.list.map((msg) =>
              m(util.MessageSummary, {
                details: msg,
                category: 'personal',
              })
            )
          )
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("mail/mail_resolver", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const util = require('mail/mail_util');
const compose = require('mail/mail_compose');

const Messages = {
  all: [],
  inbox: [],
  sent: [],
  outbox: [],
  drafts: [],
  trash: [],
  starred: [],
  system: [],
  spam: [],
  attachment: [],
  important: [],
  work: [],
  personal: [],
  todo: [],
  later: [],
  load() {
    rs.rsJsonApiRequest('/rsMail/getMessageSummaries', { box: util.BOX_ALL }, (data) => {
      if (data && data.msgList) {
        Messages.all = data.msgList;
        Messages.inbox = Messages.all.filter(
          (msg) => (msg.msgflags & util.RS_MSG_BOXMASK) === util.RS_MSG_INBOX
        );
        Messages.sent = Messages.all.filter(
          (msg) => (msg.msgflags & util.RS_MSG_BOXMASK) === util.RS_MSG_SENTBOX
        );
        Messages.outbox = Messages.all.filter(
          (msg) => (msg.msgflags & util.RS_MSG_BOXMASK) === util.RS_MSG_OUTBOX
        );
        Messages.drafts = Messages.all.filter(
          (msg) =>
            (msg.msgflags & util.RS_MSG_BOXMASK) === util.RS_MSG_DRAFTBOX ||
            (msg.msgflags & 0x05) === 0x05 ||
            (msg.msgflags & 0x04) !== 0 ||
            (msg.msgflags & 0x08) !== 0
        );
        Messages.trash = Messages.all.filter((msg) => msg.msgflags & util.RS_MSG_TRASH);
        Messages.starred = Messages.all.filter((msg) => msg.msgflags & util.RS_MSG_STAR);
        Messages.system = Messages.all.filter((msg) => msg.msgflags & util.RS_MSG_SYSTEM);
        Messages.spam = Messages.all.filter((msg) => msg.msgflags & util.RS_MSG_SPAM);

        Messages.attachment = Messages.all.filter((msg) => msg.count);

        Messages.important = Messages.all.filter(
          (msg) => msg.msgtags && msg.msgtags.includes(util.RS_MSGTAGTYPE_IMPORTANT)
        );
        Messages.work = Messages.all.filter(
          (msg) => msg.msgtags && msg.msgtags.includes(util.RS_MSGTAGTYPE_WORK)
        );
        Messages.personal = Messages.all.filter(
          (msg) => msg.msgtags && msg.msgtags.includes(util.RS_MSGTAGTYPE_PERSONAL)
        );
        Messages.todo = Messages.all.filter(
          (msg) => msg.msgtags && msg.msgtags.includes(util.RS_MSGTAGTYPE_TODO)
        );
        Messages.later = Messages.all.filter(
          (msg) => msg.msgtags && msg.msgtags.includes(util.RS_MSGTAGTYPE_LATER)
        );
      }
    });
  },
};

const sections = {
  inbox: require('mail/mail_inbox'),
  outbox: require('mail/mail_outbox'),
  drafts: require('mail/mail_draftbox'),
  sent: require('mail/mail_sentbox'),
  trash: require('mail/mail_trashbox'),
  starred: require('mail/mail_starred'),
  system: require('mail/mail_system'),
  spam: require('mail/mail_spam'),
  attachment: require('mail/mail_attachment'),
};
const sectionsquickview = {
  important: require('mail/mail_important'),
  work: require('mail/mail_work'),
  todo: require('mail/mail_todo'),
  later: require('mail/mail_later'),
  personal: require('mail/mail_personal'),
};
const tagselect = {
  opts: [
    { label: '🏷️ Filter by Tag...', val: '' },
    { label: '🔴 Important', val: 'important' },
    { label: '🟠 Work', val: 'work' },
    { label: '🟢 Personal', val: 'personal' },
    { label: '🔵 Todo', val: 'todo' },
    { label: '🟣 Later', val: 'later' },
  ],
};
const Layout = () => {
  let showCompose = false;
  let mobileNavOpen = false;
  // setFunction like react to show/hide popup
  function setShowCompose(bool) {
    showCompose = bool;
  }
  return {
    oninit: () => Messages.load(),
    view: (vnode) => {
      const sectionsSize = {
        inbox: (Messages.inbox || []).length,
        outbox: (Messages.outbox || []).length,
        drafts: (Messages.drafts || []).length,
        sent: (Messages.sent || []).length,
        trash: (Messages.trash || []).length,
        starred: (Messages.starred || []).length,
        system: (Messages.system || []).length,
        spam: (Messages.spam || []).length,
        attachment: (Messages.attachment || []).length,
      };
      const sectionsQuickviewSize = {
        important: (Messages.important || []).length,
        work: (Messages.work || []).length,
        todo: (Messages.todo || []).length,
        later: (Messages.later || []).length,
        personal: (Messages.personal || []).length,
      };
      const activeTab = m.route.param().tab;
      const activeBox = tabConfig[activeTab];
      const activeBoxIcons = {
        inbox: 'fa-inbox', outbox: 'fa-envelope-open-text', drafts: 'fa-edit', sent: 'fa-envelope-open',
        trash: 'fa-trash-alt', starred: 'fa-star', system: 'fa-bell', spam: 'fa-fire', attachment: 'fa-paperclip',
        important: 'fa-square', work: 'fa-square', todo: 'fa-square', later: 'fa-square', personal: 'fa-square',
      };

      return [
        m('.side-bar', [
          m('button.mail-mobile-nav-toggle[type=button][aria-label=Open mail navigation]', {
            'aria-expanded': mobileNavOpen,
            onclick: () => { mobileNavOpen = !mobileNavOpen; },
          }, m('i.fas.fa-bars')),
          m('.mail-nav-drawer', { class: mobileNavOpen ? 'mail-nav-drawer--open' : '' }, [
          m(
            'button.mail-compose-btn',
            {
              style: 'display: flex; align-items: center; justify-content: center; gap: 0.5rem;',
              onclick: () => {
                mobileNavOpen = false;
                setShowCompose(true);
              },
            },
            [m('i.fas.fa-pen'), 'Compose']
          ),
          m(util.Sidebar, {
            tabs: Object.keys(sections),
            size: sectionsSize,
            baseRoute: '/mail/',
            onNavigate: () => { mobileNavOpen = false; },
          }),
          m(util.SidebarQuickView, {
            tabs: Object.keys(sectionsquickview),
            size: sectionsQuickviewSize,
            baseRoute: '/mail/',
            onNavigate: () => { mobileNavOpen = false; },
          }),
          ]),
        ]),
        m(
          '.node-panel',
          m('.widget', [
            m.route.get().split('/').length < 4 &&
            m('.top-heading', [
              m(
                'select.mail-tag',
                {
                  value: m.route.param().tab || '',
                  onchange: (e) => {
                    const selectedTag = e.target.value;
                    if (selectedTag) {
                      m.route.set('/mail/:tab', { tab: selectedTag });
                    }
                  },
                },
                tagselect.opts.map((opt) => m('option', { value: opt.val }, opt.label))
              ),
              m(util.SearchBar, { list: {} }),
            ]),
            activeBox
              ? m('.mail-box-content', [
                  m('.mail-mobile-box-title', [
                    m('i.fas', { class: activeBoxIcons[activeTab] || 'fa-envelope' }),
                    m('span', activeBox.title),
                  ]),
                  vnode.children,
                ])
              : vnode.children,
          ])
        ),
        m(
          'button.mobile-fab-compose',
          {
            title: 'Compose Mail',
            onclick: () => setShowCompose(true),
          },
          m('i.fas.fa-pen')
        ),
        showCompose && m(
          '.composePopupOverlay#mailComposerPopup',
          m(
            '.composePopup',
            m(compose, { msgType: 'compose', setShowCompose }),
            m('button.red.close-btn', { onclick: () => setShowCompose(false) }, m('i.fas.fa-times'))
          )
        ),
      ];
    },
  };
};

const tabConfig = {
  inbox: { title: 'Inbox', category: 'inbox' },
  outbox: { title: 'Outbox', category: 'outbox' },
  drafts: { title: 'Draft', category: 'drafts' },
  sent: { title: 'Sent', category: 'sent' },
  trash: { title: 'Trash', category: 'trash' },
  starred: { title: 'Starred', category: 'starred' },
  system: { title: 'System', category: 'system' },
  spam: { title: 'Spam', category: 'spam' },
  attachment: { title: 'Attachments', category: 'attachment' },
  important: { title: 'Important', category: 'important' },
  work: { title: 'Work', category: 'work' },
  todo: { title: 'Todo', category: 'todo' },
  later: { title: 'Later', category: 'later' },
  personal: { title: 'Personal', category: 'personal' },
};

const GenericMailList = () => {
  return {
    view: (vnode) => {
      const { title, category, list } = vnode.attrs;
      return [
        m('.widget__heading', m('h3', title)),
        m('.widget__body', [
          m(
            util.Table,
            m(
              'tbody',
              list.map((msg) =>
                m(util.MessageSummary, {
                  key: msg.msgId,
                  details: msg,
                  category,
                })
              )
            )
          ),
        ]),
      ];
    },
  };
};

module.exports = {
  view: ({ attrs, attrs: { tab, msgId } }) => {
    // TODO: utilize multiple routing params
    if (Object.prototype.hasOwnProperty.call(attrs, 'msgId')) {
      return m(Layout, m(util.MessageView, { msgId }));
    }

    if (tab === 'attachment') {
      return m(
        Layout,
        m(sections.attachment, {
          list: util.sortList(Messages[tab]),
        })
      );
    }

    const config = tabConfig[tab];
    if (config) {
      return m(
        Layout,
        m(GenericMailList, {
          title: config.title,
          category: config.category,
          list: util.sortList(Messages[tab]),
        })
      );
    }

    return m(
      Layout,
      m(sections[tab] || sectionsquickview[tab], {
        list: util.sortList(Messages[tab]),
      })
    );
  },
};
 
}); 
require.register("mail/mail_sentbox", function(exports, require, module) { 
const m = require('mithril');

const util = require('mail/mail_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Sent')),
      m('.widget__body', [
        m(
          util.Table,
          m(
            'tbody',
            v.attrs.list.map((msg) =>
              m(util.MessageSummary, {
                details: msg,
                category: 'sent',
              })
            )
          )
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("mail/mail_spam", function(exports, require, module) { 
const m = require('mithril');
const util = require('mail/mail_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Spam')),
      m('.widget__body', [
        m(
          util.Table,
          m(
            'tbody',
            v.attrs.list.map((msg) =>
              m(util.MessageSummary, {
                details: msg,
                category: 'spam',
              })
            )
          )
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("mail/mail_starred", function(exports, require, module) { 
const m = require('mithril');
const util = require('mail/mail_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Starred')),
      m('.widget__body', [
        m(
          util.Table,
          m(
            'tbody',
            v.attrs.list.map((msg) =>
              m(util.MessageSummary, {
                details: msg,
                category: 'starred',
              })
            )
          )
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("mail/mail_system", function(exports, require, module) { 
const m = require('mithril');
const util = require('mail/mail_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'System')),
      m('.widget__body', [
        m(
          util.Table,
          m(
            'tbody',
            v.attrs.list.map((msg) =>
              m(util.MessageSummary, {
                details: msg,
                category: 'system',
              })
            )
          )
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("mail/mail_todo", function(exports, require, module) { 
const m = require('mithril');
const util = require('mail/mail_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Todo')),
      m('.widget__body', [
        m(
          util.Table,
          m(
            'tbody',
            v.attrs.list.map((msg) =>
              m(util.MessageSummary, {
                details: msg,
                category: 'todo',
              })
            )
          )
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("mail/mail_trashbox", function(exports, require, module) { 
const m = require('mithril');
const util = require('mail/mail_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Trash')),
      m('.widget__body', [
        m(
          util.Table,
          m(
            'tbody',
            v.attrs.list.map((msg) =>
              m(util.MessageSummary, {
                details: msg,
                category: 'trash',
              })
            )
          )
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("mail/mail_util", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const util = require('files/files_util');
const widget = require('widgets');
const peopleUtil = require('people/people_util');
const compose = require('mail/mail_compose');
const renderIdentityTooltip = require('mail/mail_identity_tooltip');

// rsmail.h
const RS_MSG_BOXMASK = 0x000f;

const RS_MSG_INBOX = 0x00;
const RS_MSG_SENTBOX = 0x01;
const RS_MSG_OUTBOX = 0x03;
const RS_MSG_DRAFTBOX = 0x05;
const RS_MSG_TRASH = 0x000020;
const RS_MSG_NEW = 0x10;
const RS_MSG_UNREAD_BY_USER = 0x40;
const RS_MSG_STAR = 0x200;
const RS_MSG_SPAM = 0x040000;

const RS_MSGTAGTYPE_IMPORTANT = 1;
const RS_MSGTAGTYPE_WORK = 2;
const RS_MSGTAGTYPE_PERSONAL = 3;
const RS_MSGTAGTYPE_TODO = 4;
const RS_MSGTAGTYPE_LATER = 5;
const RS_MSG_USER_REQUEST = 0x000400;
const RS_MSG_FRIEND_RECOMMENDATION = 0x000800;
const RS_MSG_PUBLISH_KEY = 0x020000;
const RS_MSG_SYSTEM = RS_MSG_USER_REQUEST | RS_MSG_FRIEND_RECOMMENDATION | RS_MSG_PUBLISH_KEY;

const MSG_ADDRESS_MODE_TO = 0x01;
const MSG_ADDRESS_MODE_CC = 0x02;
const MSG_ADDRESS_MODE_BCC = 0x03;

const BOX_ALL = 0x06;

const MessageCache = {};
const UserNicknamesCache = {};
const MailGxsDetailsCache = {};
const MailHoverState = {
  hoveredUser: null,
};

function renderMailUserTooltip() {
  if (!MailHoverState.hoveredUser) return null;
  const hUser = MailHoverState.hoveredUser;
  const details = MailGxsDetailsCache[hUser.gxsId];
  if (!details) return null;

  return renderIdentityTooltip({
    details,
    gxsId: hUser.gxsId,
    name: hUser.name,
    rect: hUser.rect,
  });
}

const tagTypesCache = {};
const defaultTagTypes = {
  1: { name: 'Important', color: '#ef4444' },
  2: { name: 'Work', color: '#f97316' },
  3: { name: 'Personal', color: '#22c55e' },
  4: { name: 'Todo', color: '#3b82f6' },
  5: { name: 'Later', color: '#a855f7' },
};

function getTagDetails(tagId) {
  return tagTypesCache[tagId] || defaultTagTypes[tagId] || { name: `Tag ${tagId}`, color: '#cbd5e1' };
}

function loadTagTypes() {
  rs.rsJsonApiRequest('/rsMail/getMessageTagTypes', {}, (res) => {
    if (res && res.body && res.body.tags && res.body.tags.types) {
      res.body.tags.types.forEach((tag) => {
        tagTypesCache[tag.key] = {
          name: tag.value.first,
          color: `#${tag.value.second.toString(16).padStart(6, '0')}`,
        };
      });
    }
  });
}
loadTagTypes();

function formatMailDate(ts) {
  if (!ts) return '';
  const date = new Date(ts * 1000);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const isThisYear = date.getFullYear() === now.getFullYear();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (isThisYear) {
    return `${date.getDate()} ${months[date.getMonth()]}`;
  }
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().slice(2)}`;
}

// Utility functions
const humanReadableSize = (fileSize) => {
  return fileSize / 1024 > 1024
    ? fileSize / 1024 / 1024 > 1024
      ? (fileSize / 1024 / 1024 / 1024).toFixed(2) + ' GB'
      : (fileSize / 1024 / 1024).toFixed(2) + ' MB'
    : (fileSize / 1024).toFixed(2) + ' KB';
};

// Layouts
const MessageSummary = () => {
  let details = {};
  let files;
  let isStarred = false;
  let msgStatus = '';
  let fromUserInfo;
  function starMessage(e) {
    isStarred = !isStarred;
    rs.rsJsonApiRequest('/rsMail/MessageStar', { msgId: details.msgId, mark: isStarred });
    // Stop event bubbling, both functions for supporting IE & FF
    e.stopImmediatePropagation();
    e.preventDefault();
  }
  return {
    oninit: (v) => {
      rs.rsJsonApiRequest('/rsMail/getMessage', {
        msgId: v.attrs.details.msgId,
      })
        .then((res) => {
          if (res.body.retval) {
            details = res.body.msg;
            details.msgtags = v.attrs.details.msgtags;
            files = details.files;
            isStarred = (details.msgflags & 0xf00) === RS_MSG_STAR;
            const flag = details.msgflags & 0xf0;
            msgStatus = flag === RS_MSG_NEW || flag === RS_MSG_UNREAD_BY_USER ? 'unread' : 'read';
            MessageCache[v.attrs.details.msgId] = details;
          }
        })
        .then(() => {
          if (details?.from?._addr_string) {
            rs.rsJsonApiRequest(
              '/rsIdentity/getIdDetails',
              { id: details.from._addr_string },
              (data) => {
                fromUserInfo = data.details;
                if (fromUserInfo) {
                  UserNicknamesCache[details.from._addr_string] = fromUserInfo.mNickname || '';
                  MailGxsDetailsCache[details.from._addr_string] = fromUserInfo;
                }
              }
            );
          }
        });
    },
    view: (v) =>
      m(
        'tr.msgbody',
        {
          key: v.attrs.details.msgId,
          class: msgStatus,
          onclick: () =>
            m.route.set('/mail/:tab/:msgId', { tab: v.attrs.category, msgId: v.attrs.details.msgId }),
        },
        [
          m(
            'td.cell-star',
            m(`input.star-check[type=checkbox][id=msg-${v.attrs.details.msgId}]`, { checked: isStarred }),
            // Use label with  [for] to manipulate hidden checkbox
            m(
              `label.star-check[for=msg-${v.attrs.details.msgId}]`,
              {
                onclick: starMessage,
                class: (details.msgflags & 0xf00) === RS_MSG_STAR ? 'starred' : 'unstarred',
              },
              m('i.fas.fa-star')
            )
          ),
          m('td.cell-attachment', files && files.length > 0 ? m('i.fas.fa-paperclip', { title: `${files.length} attachment(s)` }) : null),
          m('td.cell-subject', [
            m('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }
            }, [
              m('span', details.title),
              details.msgtags && details.msgtags.length > 0 && m('.mail-tags-container', { style: 'display: inline-flex; gap: 0.25rem;' },
                details.msgtags.map((tagId) => {
                  const tag = getTagDetails(tagId);
                  return m('span.mail-tag-badge', {
                    title: tag.name,
                    style: `display: inline-block; width: 10px; height: 10px; border-radius: 2px; background-color: ${tag.color};`
                  });
                })
              )
            ])
          ]),
          m(
            'td.cell-from',
            m(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  justifyContent: 'start',
                  cursor: 'pointer',
                },
                onmouseenter: (e) => {
                  if (!details?.from?._addr_string) return;
                  const gxsId = details.from._addr_string;
                  const name = fromUserInfo && Number(fromUserInfo.mId) !== 0 ? fromUserInfo.mNickname : '[Unknown]';
                  const rect = e.currentTarget.getBoundingClientRect();
                  MailHoverState.hoveredUser = { gxsId, name, rect };
                  if (fromUserInfo) MailGxsDetailsCache[gxsId] = fromUserInfo;
                  if (!MailGxsDetailsCache[gxsId]) {
                    rs.rsJsonApiRequest('/rsIdentity/getIdDetails', { id: gxsId }, (d) => {
                      if (d && d.details) {
                        MailGxsDetailsCache[gxsId] = d.details;
                        m.redraw();
                      }
                    });
                  }
                  m.redraw();
                },
                onmouseleave: () => {
                  MailHoverState.hoveredUser = null;
                  m.redraw();
                }
              },
              [
                m(peopleUtil.UserAvatar, {
                  avatar: fromUserInfo?.mAvatar,
                  firstLetter: (fromUserInfo?.mNickname || '').slice(0, 1).toUpperCase(),
                  identityId: details.from?._addr_string,
                  size: 24,
                }),
                m('span', fromUserInfo && Number(fromUserInfo.mId) !== 0 ? fromUserInfo.mNickname : '[Unknown]'),
              ]
            )
          ),
          m('td.cell-date', { title: new Date(details.ts * 1000).toLocaleString() }, formatMailDate(details.ts)),
        ]
      ),
  };
};

const AttachmentSection = () => {
  function handleAttachmentDownload(item) {
    const { fname: fileName, hash, size } = item;
    const xstr64 = typeof size === 'object' ? size.xstr64 : String(size);
    const flags = util.RS_FILE_REQ_ANONYMOUS_ROUTING;
    rs.rsJsonApiRequest(
      '/rsFiles/FileRequest',
      { fileName, hash, flags, size: { xstr64 } },
      (status) =>
        widget.popupMessage([
          m('i.fas.fa-file-medical'),
          m('h3', `File is ${status.retval ? 'being' : 'already'} downloaded!`),
        ])
    ).catch((error) => { });
  }
  return {
    view: (v) =>
      m('.attachments-wrapper', [
        v.attrs.files.map((file) => {
          const fileSizeNum = file.size ? (typeof file.size === 'object' ? file.size.xint64 || parseInt(file.size.xstr64) || 0 : Number(file.size) || 0) : 0;
          return m('.attachment-card', [
            m('.attachment-icon', m('i.fas.fa-paperclip')),
            m('.attachment-info', [
              m('.attachment-name', file.fname),
              m('.attachment-size', humanReadableSize(fileSizeNum)),
            ]),
            m(
              'button.btn-attachment-download',
              { onclick: () => handleAttachmentDownload(file) },
              [m('i.fas.fa-download'), m('span.btn-text', ' Download')]
            ),
          ]);
        }),
      ]),
  };
};

const MessageView = () => {
  let showCompose = false;
  let composeType = 'reply';
  // setFunction like react to show/hide popup
  function setShowCompose(bool) {
    showCompose = bool;
  }
  const MailData = {
    msgId: '',
    message: '',
    subject: '',
    sender: {},
    recipients: [],
    toList: {},
    ccList: {},
    bccList: {},
    timeStamp: '',
    files: [],
  };
  function deleteMail() {
    rs.rsJsonApiRequest('/rsMail/MessageToTrash', { msgId: MailData.msgId, bTrash: true });
    rs.rsJsonApiRequest('/rsMail/MessageDelete', { msgId: MailData.msgId }).then((res) => {
      widget.popupMessage(
        m('.widget', [
          m('.widget__heading', m('h3', res.body.retval ? 'Success' : 'Error')),
          m('.widget__body', m('p', res.body.retval ? 'Mail Deleted.' : 'Error in Deleting.')),
        ])
      );
      m.route.set('/mail/:tab', { tab: m.route.param().tab });
    });
  }
  function confirmMailDelete() {
    widget.popupMessage([
      m('p', 'Are you sure you want to delete this mail?'),
      m('button', { onclick: deleteMail }, 'Delete'),
    ]);
  }

  return {
    oninit: async (v) => {
      const res = await rs.rsJsonApiRequest('/rsMail/getMessage', {
        msgId: v.attrs.msgId,
      });
      if (res.body.retval) {
        const msgDetails = await res.body.msg;
        msgDetails.files.forEach((element) =>
          MailData.files.push({ ...element, from: msgDetails.from, ts: msgDetails.ts })
        );
        // regex to detect html tags, better regex?  /<[a-z][\s\S]*>/gi
        MailData.message = /<\/*[a-z][^>]+?>/gi.test(msgDetails.msg)
          ? msgDetails.msg
          : `<p style="white-space: pre">${msgDetails.msg}</p>`;
        document.querySelector('#msgView').innerHTML = MailData.message;
        MailData.msgId = msgDetails.msgId;
        MailData.sender = msgDetails.from;
        MailData.subject = msgDetails.title;
        MailData.timeStamp = msgDetails.ts;
        MailData.recipients = msgDetails.destinations;
        MailData?.recipients?.forEach((destDetail) => {
          const { _addr_string: addrString, _mode: mode } = destDetail; // destructuring + renaming
          if (mode === MSG_ADDRESS_MODE_TO && !MailData.toList[addrString]) {
            MailData.toList[addrString] = destDetail;
          } else if (mode === MSG_ADDRESS_MODE_CC && !MailData.ccList[addrString]) {
            MailData.ccList[addrString] = destDetail;
          } else if (mode === MSG_ADDRESS_MODE_BCC && !MailData.bccList[addrString]) {
            MailData.bccList[addrString] = destDetail;
          }
          if (addrString && !UserNicknamesCache[addrString]) {
            rs.rsJsonApiRequest(
              '/rsIdentity/getIdDetails',
              { id: addrString },
              (data) => {
                if (data?.details) {
                  UserNicknamesCache[addrString] = data.details.mNickname || '';
                }
              }
            );
          }
        });
        rs.rsJsonApiRequest(
          '/rsIdentity/getIdDetails',
          { id: MailData?.sender?._addr_string },
          (data) => {
            if (data?.details) {
              MailData.avatar = data.details.mAvatar;
              UserNicknamesCache[MailData.sender._addr_string] = data.details.mNickname || '';
            }
          }
        );
      }
    },
    view: () =>
      m(
        '.msg-view',
        [
          m('.msg-view-nav', [
            m(
              'a[title=Back]',
              { onclick: () => m.route.set('/mail/:tab', { tab: m.route.param().tab }) },
              m('i.fas.fa-arrow-left')
            ),
            m('.msg-view-nav__action', [
              m('button', { onclick: () => { composeType = 'reply'; setShowCompose(true); } }, [m('i.fas.fa-reply'), m('span.btn-text', ' Reply')]),
              m('button', { onclick: () => { composeType = 'replyAll'; setShowCompose(true); } }, [m('i.fas.fa-reply-all'), m('span.btn-text', ' Reply All')]),
              m('button', { onclick: () => { composeType = 'forward'; setShowCompose(true); } }, [m('i.fas.fa-forward'), m('span.btn-text', ' Forward')]),
              m('button.red', { onclick: confirmMailDelete }, [m('i.fas.fa-trash'), m('span.btn-text', ' Delete')]),
            ]),
          ]),
          m('.msg-view__header', [
            m('h3', MailData.subject),
            m('.msg-details', [
              MailData.sender &&
              m(peopleUtil.UserAvatar, {
                avatar: MailData.avatar,
                firstLetter: (UserNicknamesCache[MailData.sender._addr_string] || rs.userList.username(MailData.sender._addr_string) || '').slice(0, 1).toUpperCase(),
                identityId: MailData.sender._addr_string,
              }),
              m('.msg-details__info', [
                MailData.sender &&
                m('.msg-details__info-item', {
                  style: { cursor: 'pointer', display: 'inline-flex', gap: '0.25rem', alignItems: 'center' },
                  onmouseenter: (e) => {
                    if (!MailData.sender._addr_string) return;
                    const gxsId = MailData.sender._addr_string;
                    const name = UserNicknamesCache[gxsId] || rs.userList.username(gxsId) || 'Unknown';
                    const rect = e.currentTarget.getBoundingClientRect();
                    MailHoverState.hoveredUser = { gxsId, name, rect };
                    if (!MailGxsDetailsCache[gxsId]) {
                      rs.rsJsonApiRequest('/rsIdentity/getIdDetails', { id: gxsId }, (d) => {
                        if (d && d.details) {
                          MailGxsDetailsCache[gxsId] = d.details;
                          m.redraw();
                        }
                      });
                    }
                    m.redraw();
                  },
                  onmouseleave: () => {
                    MailHoverState.hoveredUser = null;
                    m.redraw();
                  }
                }, [
                  m('b', 'From: '),
                  UserNicknamesCache[MailData.sender._addr_string] || rs.userList.username(MailData.sender._addr_string) || 'Unknown',
                ]),
                m('.msg-details__info-item', [
                  m('b', 'To: '),
                  MailData.toList && Object.keys(MailData.toList).length > 0
                    ? [
                      m('#truncate.truncated-view', [
                        Object.keys(MailData.toList).map((key, index) =>
                          m('span', { key: index }, `${UserNicknamesCache[key] || rs.userList.username(key) || 'Unknown'}, `)
                        ),
                      ]),
                      m(
                        'button.toggle-truncate',
                        {
                          style: {
                            display: Object.keys(MailData.toList).length > 10 ? 'block' : 'none',
                          },
                          onclick: () => {
                            document
                              .querySelector('#truncate')
                              .classList.toggle('truncated-view');
                          },
                        },
                        '...'
                      ),
                    ]
                    : m('span', 'Unknown'),
                ]),
                MailData.ccList &&
                Object.keys(MailData.ccList).length > 0 &&
                m('.msg-details__info-item', [
                  m('b', 'Cc: '),
                  Object.keys(MailData.ccList).map((key, index) =>
                    m('span', { key: index }, `${UserNicknamesCache[key] || rs.userList.username(key) || 'Unknown'}, `)
                  ),
                ]),
                MailData.bccList &&
                Object.keys(MailData.bccList).length > 0 &&
                m('.msg-details__info-item', [
                  m('b', 'Bcc: '),
                  Object.keys(MailData.bccList).map((key, index) =>
                    m('span', { key: index }, `${UserNicknamesCache[key] || rs.userList.username(key) || 'Unknown'}, `)
                  ),
                ]),
              ]),
            ]),
          ]),
          m('.msg-view__body', m('#msgView')),
          MailData.files.length > 0 &&
          m('.msg-view__attachment', [
            m('h3', 'Attachments'),
            m('.msg-view__attachment-items', m(AttachmentSection, { files: MailData.files })),
          ]),
        ],
        showCompose && m(
          '.composePopupOverlay#mailComposerPopup',
          m(
            '.composePopup',
            MailData.sender._addr_string
              ? m(compose, {
                msgType: composeType,
                senderId: MailData.sender._addr_string,
                recipientList: MailData.toList,
                ccList: MailData.ccList,
                subject: MailData.subject,
                replyMessage: MailData.message,
                timeStamp: new Date(MailData.timeStamp * 1000),
                setShowCompose,
              })
              : m('.widget', m('.widget__heading', m('h3', 'Sender is not known'))),
            m('button.red.close-btn', { onclick: () => setShowCompose(false) }, m('i.fas.fa-times'))
          )
        ),
        renderMailUserTooltip(),
      ),
  };
};

const SortState = {
  column: 'date',
  direction: 'desc',
};

function setSort(column) {
  if (SortState.column === column) {
    SortState.direction = SortState.direction === 'asc' ? 'desc' : 'asc';
  } else {
    SortState.column = column;
    SortState.direction = (column === 'date' || column === 'attachments' || column === 'starred') ? 'desc' : 'asc';
  }
}

function sortList(list) {
  if (!list) return [];
  return [...list].sort((msgA, msgB) => {
    let valA, valB;
    switch (SortState.column) {
      case 'starred': {
        const aStarred = (MessageCache[msgA.msgId]?.msgflags & 0xf00) === RS_MSG_STAR || (msgA.msgflags & 0xf00) === RS_MSG_STAR;
        const bStarred = (MessageCache[msgB.msgId]?.msgflags & 0xf00) === RS_MSG_STAR || (msgB.msgflags & 0xf00) === RS_MSG_STAR;
        valA = aStarred ? 1 : 0;
        valB = bStarred ? 1 : 0;
        break;
      }
      case 'attachments': {
        const aCount = MessageCache[msgA.msgId]?.files?.length || msgA.count || 0;
        const bCount = MessageCache[msgB.msgId]?.files?.length || msgB.count || 0;
        valA = Number(aCount);
        valB = Number(bCount);
        break;
      }
      case 'subject': {
        const aTitle = MessageCache[msgA.msgId]?.title || msgA.title || '';
        const bTitle = MessageCache[msgB.msgId]?.title || msgB.title || '';
        valA = aTitle.toLowerCase();
        valB = bTitle.toLowerCase();
        break;
      }
      case 'from': {
        const aSenderId = MessageCache[msgA.msgId]?.from?._addr_string || msgA.from?._addr_string;
        const bSenderId = MessageCache[msgB.msgId]?.from?._addr_string || msgB.from?._addr_string;
        const aName = aSenderId && rs.userList.userMap[aSenderId];
        const bName = bSenderId && rs.userList.userMap[bSenderId];
        const aFrom = (UserNicknamesCache[aSenderId] || (aName && aName.name) || aName || '') + '';
        const bFrom = (UserNicknamesCache[bSenderId] || (bName && bName.name) || bName || '') + '';
        valA = aFrom.toLowerCase();
        valB = bFrom.toLowerCase();
        break;
      }
      case 'date':
      default: {
        const aTs = MessageCache[msgA.msgId]?.ts || msgA.ts?.xint64 || msgA.ts || 0;
        const bTs = MessageCache[msgB.msgId]?.ts || msgB.ts?.xint64 || msgB.ts || 0;
        valA = Number(aTs);
        valB = Number(bTs);
        break;
      }
    }

    if (valA < valB) return SortState.direction === 'asc' ? -1 : 1;
    if (valA > valB) return SortState.direction === 'asc' ? 1 : -1;
    return 0;
  });
}

const Table = () => {
  let currentPage = 0;
  const pageSize = 50;
  return {
    view: (v) => {
      const renderHeader = (colName, label, isIcon = false) => {
        const isActive = SortState.column === colName;
        const iconClass = isActive
          ? (SortState.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down')
          : 'fas fa-sort';
        return m(
          'th.sortable-th',
          {
            onclick: () => setSort(colName),
            style: { cursor: 'pointer', userSelect: 'none' },
          },
          [
            isIcon ? label : m('span', label),
            ' ',
            m(`i.${iconClass}`, {
              style: {
                marginLeft: '0.25rem',
                opacity: isActive ? 1 : 0.2,
                transition: 'opacity 0.2s',
              },
            }),
          ]
        );
      };

      let totalItems = 0;
      const tbody = v.children[0];
      if (tbody && tbody.children) {
        const flatChildren = Array.isArray(tbody.children) ? tbody.children.flat().filter(Boolean) : [tbody.children].filter(Boolean);
        totalItems = flatChildren.length;

        const start = currentPage * pageSize;
        const end = start + pageSize;
        tbody.children = flatChildren.slice(start, end);
      }

      const totalPages = Math.ceil(totalItems / pageSize) || 1;
      if (currentPage >= totalPages) currentPage = totalPages - 1;
      if (currentPage < 0) currentPage = 0;

      const paginationUI = totalItems > pageSize && m('.pagination', {
        style: {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem',
          borderTop: '1px solid #eee',
          fontSize: '1rem',
          color: '#555',
          userSelect: 'none'
        }
      }, [
        m('button', {
          disabled: currentPage === 0,
          onclick: () => currentPage--,
          style: {
            padding: '0.4rem 0.8rem',
            background: currentPage === 0 ? '#ccc' : '#019dff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
            boxShadow: 'none'
          }
        }, m('i.fas.fa-chevron-left')),
        m('span.bold', `${totalItems > 0 ? currentPage * pageSize + 1 : 0} - ${Math.min((currentPage + 1) * pageSize, totalItems)} of ${totalItems}`),
        m('button', {
          disabled: currentPage >= totalPages - 1,
          onclick: () => currentPage++,
          style: {
            padding: '0.4rem 0.8rem',
            background: currentPage >= totalPages - 1 ? '#ccc' : '#019dff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
            boxShadow: 'none'
          }
        }, m('i.fas.fa-chevron-right'))
      ]);

      return m('.table-pagination-container', [
        m('table.mails', [
          m('tr', [
            renderHeader('starred', m('i.fas.fa-star'), true),
            renderHeader('attachments', m('i.fas.fa-paperclip'), true),
            renderHeader('subject', 'Subject'),
            renderHeader('from', 'From'),
            renderHeader('date', 'Date'),
          ]),
          tbody,
        ]),
        paginationUI,
        renderMailUserTooltip(),
      ]);
    },
  };
};

const SearchBar = () => {
  let searchString = '';
  return {
    view: ({ attrs: { list } }) =>
      m('input[type=text][placeholder=Search Subject].searchbar', {
        value: searchString,
        oninput: (e) => {
          searchString = e.target.value.toLowerCase();
          for (const hash in list) {
            list[hash].isSearched = list[hash].fname.toLowerCase().indexOf(searchString) > -1;
          }
        },
      }),
  };
};

const activeSideLink = {
  sideactive: 0,
  quicksideactive: -1,
};

const sidebarIcons = {
  inbox: m('i.fas.fa-inbox', { style: 'color: #3b82f6; margin-right: 0.75rem; font-size: 24px; width: 24px; text-align: center;' }),
  outbox: m('i.fas.fa-envelope-open-text', { style: 'color: #10b981; margin-right: 0.75rem; font-size: 24px; width: 24px; text-align: center;' }),
  drafts: m('i.fas.fa-edit', { style: 'color: #6b7280; margin-right: 0.75rem; font-size: 24px; width: 24px; text-align: center;' }),
  sent: m('i.fas.fa-envelope-open', { style: 'color: #f59e0b; margin-right: 0.75rem; font-size: 24px; width: 24px; text-align: center;' }),
  trash: m('i.fas.fa-trash-alt', { style: 'color: #ef4444; margin-right: 0.75rem; font-size: 24px; width: 24px; text-align: center;' }),
  starred: m('i.fas.fa-star', { style: 'color: #eab308; margin-right: 0.75rem; font-size: 24px; width: 24px; text-align: center;' }),
  system: m('i.fas.fa-bell', { style: 'color: #3b82f6; margin-right: 0.75rem; font-size: 24px; width: 24px; text-align: center;' }),
  spam: m('i.fas.fa-fire', { style: 'color: #f97316; margin-right: 0.75rem; font-size: 24px; width: 24px; text-align: center;' }),
  attachment: m('i.fas.fa-paperclip', { style: 'color: #06b6d4; margin-right: 0.75rem; font-size: 24px; width: 24px; text-align: center;' }),
  important: m('i.fas.fa-square', { style: 'color: #ef4444; margin-right: 0.75rem; font-size: 24px; width: 24px; text-align: center;' }),
  work: m('i.fas.fa-square', { style: 'color: #f97316; margin-right: 0.75rem; font-size: 24px; width: 24px; text-align: center;' }),
  personal: m('i.fas.fa-square', { style: 'color: #22c55e; margin-right: 0.75rem; font-size: 24px; width: 24px; text-align: center;' }),
  todo: m('i.fas.fa-square', { style: 'color: #3b82f6; margin-right: 0.75rem; font-size: 24px; width: 24px; text-align: center;' }),
  later: m('i.fas.fa-square', { style: 'color: #a855f7; margin-right: 0.75rem; font-size: 24px; width: 24px; text-align: center;' }),
};

const Sidebar = () => {
  return {
    view: ({ attrs: { tabs, baseRoute, size, onNavigate } }) =>
      m(
        '.sidebar',
        tabs.map((panelName, index) => {
          const displayName = panelName.charAt(0).toUpperCase() + panelName.slice(1);
          return m(
            m.route.Link,
            {
              class: index === activeSideLink.sideactive ? 'selected-sidebar-link' : '',
              style: 'display: flex; align-items: center;',
              onclick: () => {
                activeSideLink.sideactive = index;
                activeSideLink.quicksideactive = -1;
                if (onNavigate) onNavigate();
              },
              href: baseRoute + panelName,
            },
            [
              sidebarIcons[panelName] || null,
              m('span.sidebar-link-text', displayName),
              size[panelName] > 0 && m('span.sidebar-badge', size[panelName]),
            ]
          );
        })
      ),
  };
};

const SidebarQuickView = () => {
  // for the Mail tab, to be moved later.
  return {
    view: ({ attrs: { tabs, baseRoute, size, onNavigate } }) =>
      m(
        '.sidebarquickview',
        m('h6.bold', 'Quick View'),
        tabs.map((panelName, index) => {
          const displayName = panelName.charAt(0).toUpperCase() + panelName.slice(1);
          return m(
            m.route.Link,
            {
              class:
                index === activeSideLink.quicksideactive ? 'selected-sidebarquickview-link' : '',
              style: 'display: flex; align-items: center;',
              onclick: () => {
                activeSideLink.quicksideactive = index;
                activeSideLink.sideactive = -1;
                if (onNavigate) onNavigate();
              },
              href: baseRoute + panelName,
            },
            [
              sidebarIcons[panelName] || null,
              m('span.sidebar-link-text', displayName),
              size[panelName] > 0 && m('span.sidebar-badge', size[panelName]),
            ]
          );
        })
      ),
  };
};

module.exports = {
  MessageSummary,
  MessageView,
  AttachmentSection,
  Table,
  SearchBar,
  Sidebar,
  SidebarQuickView,
  SortState,
  setSort,
  sortList,
  RS_MSG_BOXMASK,
  RS_MSG_INBOX,
  RS_MSG_SENTBOX,
  RS_MSG_OUTBOX,
  RS_MSG_DRAFTBOX,
  RS_MSG_NEW,
  RS_MSG_UNREAD_BY_USER,
  RS_MSG_STAR,
  RS_MSG_TRASH,
  RS_MSG_SYSTEM,
  RS_MSG_SPAM,
  RS_MSGTAGTYPE_IMPORTANT,
  RS_MSGTAGTYPE_LATER,
  RS_MSGTAGTYPE_PERSONAL,
  RS_MSGTAGTYPE_TODO,
  RS_MSGTAGTYPE_WORK,
  BOX_ALL,
};
 
}); 
require.register("mail/mail_work", function(exports, require, module) { 
const m = require('mithril');
const util = require('mail/mail_util');

const Layout = () => {
  return {
    view: (v) => [
      m('.widget__heading', m('h3', 'Work')),
      m('.widget__body', [
        m(
          util.Table,
          m(
            'tbody',
            v.attrs.list.map((msg) =>
              m(util.MessageSummary, {
                details: msg,
                category: 'work',
              })
            )
          )
        ),
      ]),
    ],
  };
};

module.exports = Layout;
 
}); 
require.register("network/network", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const Data = require('network/network_data');
const compose = require('mail/mail_compose');
const {
  State,
  loadOwnProfile,
  loadGxsIdentities,
  fetchIdDetails,
  startDirectChat,
  getOnlineSslId,
  preloadNetworkChatHistory,
} = require('network/network_state');
const { OwnProfileCard, FriendsList } = require('network/network_friends_list');
const DetailsTab = require('network/network_details_tab');
const ChatTab = require('network/network_chat_tab');
const NetworkGraph = require('network/network_graph');

const NetworkLayout = () => {
  return {
    oninit: () => {
      Data.refreshGpgDetails().then(() => {
        preloadNetworkChatHistory();
        m.redraw();
      });
      loadOwnProfile();
      loadGxsIdentities();
    },
    onremove: () => {
      if (rs.events[15]) {
        rs.events[15].notify = () => {};
      }
    },
    view: () => {
      const selectedFriend = State.selectedFriendGpgId
        ? Data.gpgDetails[State.selectedFriendGpgId]
        : null;

      const selectedGxsId = State.selectedFriendGpgId
        ? State.gpgToGxsIdMap[State.selectedFriendGpgId.toLowerCase()]
        : null;

      if (State.selectedFriendGpgId && !selectedGxsId && State.gxsIdentities) {
        State.gxsIdentities.forEach((gxsId) => fetchIdDetails(gxsId));
      }

      return m('.network-container', [
        m('.network-left-pane', [m(OwnProfileCard), m(FriendsList)]),
        m('.network-right-pane', [
          m('.network-tabs', [
                  m(
                    'button.tab-btn' + (State.activeTab === 'details' ? '.active' : ''),
                    {
                      onclick: () => {
                        State.activeTab = 'details';
                      },
                    },
                    'Details View'
                  ),
                  m(
                    'button.tab-btn' + (State.activeTab === 'chat' ? '.active' : ''),
                    {
                      onclick: () => {
                        State.activeTab = 'chat';
                        const sslId = getOnlineSslId(State.selectedFriendGpgId);
                        if (sslId && !State.currentChatPeerId) {
                          startDirectChat(sslId);
                        }
                      },
                    },
                    'Chat Conversation'
                  ),
                  m(
                    'button.tab-btn' + (State.activeTab === 'graph' ? '.active' : ''),
                    { onclick: () => { State.activeTab = 'graph'; } },
                    [m('i.fas.fa-project-diagram'), ' Network Graph']
                  ),
          ]),
          State.activeTab === 'graph'
            ? m('.network-tab-content.network-graph-tab', m(NetworkGraph))
            : selectedFriend
              ? m('.network-tab-content', [
                  State.activeTab === 'details' ? m(DetailsTab) : m(ChatTab),
                ])
              : m('.network-pane-placeholder', [
                m('i.fas.fa-network-wired'),
                m(
                  'p',
                  'Select a friend for details or chat, or open the Network Graph tab.'
                ),
              ]),
        ]),
        State.showMailCompose &&
          State.selectedFriendGpgId &&
          m(
            '.composePopupOverlay#mailComposerPopup',
            { style: { display: 'block' } },
            m(
              '.composePopup',
              m(compose, {
                msgType: 'compose',
                toId: selectedGxsId || State.selectedFriendGpgId,
                friendName: selectedFriend ? selectedFriend.name : 'Unknown Friend',
                isDirectMail: true,
                setShowCompose: (val) => {
                  State.showMailCompose = val;
                },
              }),
              m(
                'button.red.close-btn',
                {
                  onclick: () => {
                    State.showMailCompose = false;
                  },
                },
                m('i.fas.fa-times')
              )
            )
          ),
      ]);
    },
  };
};

module.exports = NetworkLayout;
 
}); 
require.register("network/network_chat_tab", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const Data = require('network/network_data');
const {
  State,
  startDirectChat,
  getOnlineSslId,
  sendDirectChatMessage,
  loadAllDirectChatHistory,
} = require('network/network_state');
const { renderChatMessage } = require('chat/chat_state');
const chatEmoji = require('chat/chat_emoji');
const HistoryBrowserModal = require('people/people_history');

// Direct peer-to-peer chat images do NOT require 200KB compression limit
function formatDirectChatImage(file, callback) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = 1920;
      const maxHeight = 1080;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        callback(`<img src="${dataUrl}" />`);
      } else {
        callback(`<img src="${evt.target.result}" />`);
      }
    };
    img.onerror = () => {
      if (evt.target.result) {
        callback(`<img src="${evt.target.result}" />`);
      } else {
        callback(null);
      }
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function pollHashStatusForDirectChat(localpath) {
  rs.rsJsonApiRequest('/rsFiles/ExtraFileStatus', { localpath }, (data) => {
    if (data && data.retval && data.info && data.info.hash && data.info.hash !== '0000000000000000000000000000000000000000') {
      const info = data.info;
      const sizeNum = info.size.xint64 || parseInt(info.size.xstr64) || info.size;
      const fileLink = `<a href="retroshare://file?name=${encodeURIComponent(info.name)}&size=${sizeNum}&hash=${info.hash}">${info.name}</a> (${rs.formatBytes(sizeNum)})`;

      State.chatInputMsg = State.chatInputMsg ? State.chatInputMsg + '\n' + fileLink : fileLink;
      State.showAttachModal = false;
      State.isHashing = false;
      State.attachPath = '';
      m.redraw();
    } else {
      if (State.isHashing) {
        setTimeout(() => pollHashStatusForDirectChat(localpath), 1000);
      }
    }
  });
}

const ChatTab = () => {
  return {
    view: () => {
      const gpgId = State.selectedFriendGpgId;
      const friend = Data.gpgDetails[gpgId];
      if (!friend) return null;

      const sslId = getOnlineSslId(gpgId);

      if (!sslId) {
        return m('.network-chat-view', [
          m('.chat-warning', [
            m('i.fas.fa-exclamation-triangle'),
            m('h4', 'No Location Found'),
            m('p', 'This friend has no known locations to start a direct chat with.'),
          ]),
        ]);
      }

      if (!State.currentChatPeerId) {
        return m('.network-chat-view', [
          m('.chat-warning', [
            m('i.fas.fa-comments'),
            m('h4', 'Direct Chat'),
            m('p', 'Click below to start a direct chat with ' + friend.name + '.'),
            m(
              'button',
              {
                onclick: () => startDirectChat(sslId),
              },
              'Start Chat'
            ),
          ]),
        ]);
      }

      return m('.network-chat-view', [
        (() => {
          const activeLoc = friend.locations.find((loc) => loc.id === State.currentChatPeerId);
          const locName = activeLoc ? activeLoc.name : 'Unknown Location';
          const locOnline = activeLoc ? activeLoc.isOnline : false;
          return m('.chat-header-bar', {
            style: {
              padding: '0.75rem 1rem',
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }
          }, [
            m('.chat-header-info', [
              m('.chat-header-name', { style: { fontWeight: '700', color: '#1e293b' } }, friend.name),
              m('.chat-header-location', { style: { fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', marginTop: '0.25rem' } }, [
                m('span', 'Location: ' + locName),
                m('span.status-dot', {
                  style: {
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: locOnline ? '#10b981' : '#ef4444',
                    marginLeft: '6px',
                    marginRight: '4px'
                  }
                }),
                m('span', { style: { color: locOnline ? '#10b981' : '#ef4444', fontWeight: '500' } }, locOnline ? 'Online' : 'Offline')
              ])
            ]),
            m('button.blue.history-btn', {
              title: 'View all direct chat history with this friend',
              style: 'padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.35rem; border: none; cursor: pointer; background-color: #3b82f6; color: #ffffff; font-weight: 600;',
              onclick: () => {
                State.showHistoryModal = true;
                State.historySearchQuery = '';
                loadAllDirectChatHistory();
              },
            }, [m('i.fas.fa-history'), 'History'])
          ]);
        })(),
        m(
          '.chat-messages[id=chat-messages-container]',
          State.chatMessages.map((msg) => {
            const isOwn = msg.own === true || msg.incoming === false;
            const senderName = isOwn
              ? (State.ownProfile.name || 'Me')
              : friend.name;
            const time = new Date((msg.sendTime || msg.recvTime || 0) * 1000).toLocaleTimeString();
            const text = msg.msg || msg.message || '';

            return m(
              '.chat-bubble-container' + (isOwn ? '.outgoing' : '.incoming'),
              [
                !isOwn && m('.chat-sender', senderName),
                m('.chat-bubble', renderChatMessage(text)),
                m('.chat-time', time),
              ]
            );
          })
        ),
        m(HistoryBrowserModal, {
          state: State,
          name: friend.name,
          ownName: State.ownProfile.name || 'You',
        }),
        m('.chat-input-area', { style: 'display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: #ffffff; border-top: 1px solid #cbd5e1;' }, [
          m('button.chat-hub-action-btn', {
            title: 'Attach file link',
            onclick: () => {
              State.showAttachModal = true;
              State.attachPath = '';
              State.attachBrowseHint = false;
              State.hashingError = '';
              m.redraw();
            }
          }, m('i.fas.fa-paperclip')),

          m('.emoji-picker-wrapper', { style: 'position: relative;' }, [
            m('button.chat-hub-action-btn', {
              title: 'Insert emoji',
              onclick: (e) => {
                e.stopPropagation();
                State.showEmojiPicker = !State.showEmojiPicker;
              }
            }, m('i.fas.fa-smile')),
            State.showEmojiPicker && m(chatEmoji.EmojiPicker, {
              onSelect: (emoji) => {
                State.chatInputMsg = (State.chatInputMsg || '') + emoji;
                State.showEmojiPicker = false;
                m.redraw();
              }
            }),
          ]),

          m('label.chat-hub-action-btn', {
            title: 'Send image',
            style: 'cursor: pointer;',
          }, [
            m('i.fas.fa-image'),
            m('input[type=file][accept=image/*]', {
              style: 'display: none;',
              onchange: (e) => {
                if (!e.target.files || !e.target.files[0]) return;
                const file = e.target.files[0];
                formatDirectChatImage(file, (imgTag) => {
                  if (imgTag) {
                    State.chatInputMsg = (State.chatInputMsg || '') + imgTag;
                    m.redraw();
                  }
                });
                e.target.value = '';
              }
            })
          ]),

          m('textarea.chat-textarea', {
            placeholder: 'Type a message here...',
            value: State.chatInputMsg,
            style: 'flex: 1; resize: none; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.5rem; font-family: inherit; font-size: 0.9rem; outline: none; min-height: 40px; max-height: 120px;',
            oninput: (e) => {
              State.chatInputMsg = e.target.value;
            },
            onpaste: (e) => {
              const items = (e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData))?.items;
              if (!items) return;
              for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                  e.preventDefault();
                  const blob = items[i].getAsFile();
                  formatDirectChatImage(blob, (imgTag) => {
                    if (imgTag) {
                      State.chatInputMsg = (State.chatInputMsg || '') + imgTag;
                      m.redraw();
                    }
                  });
                  break;
                }
              }
            },
            onkeydown: (e) => {
              if (e.code === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendDirectChatMessage();
              }
            },
          }),
          m(
            'button.send-btn.blue',
            {
              style: 'height: 38px;',
              onclick: () => sendDirectChatMessage(),
            },
            [m('i.fas.fa-paper-plane'), ' Send']
          ),
        ]),

        State.showAttachModal && m('.attach-modal-overlay', {
          onclick: (e) => {
            if (e.target === e.currentTarget && !State.isHashing) {
              State.showAttachModal = false;
              State.attachPath = '';
              State.attachBrowseHint = false;
              State.hashingError = '';
            }
          }
        }, [
          m('.attach-modal', [
            m('.attach-modal-header', [
              m('i.fas.fa-paperclip.attach-modal-icon'),
              m('h4', 'Attach File to Direct Chat'),
            ]),
            m('p', 'Browse for a file or type the absolute path on your local system:'),
            m('input#direct-attach-file-picker[type=file]', {
              style: 'display:none',
              onchange: (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                  const fullPath = file.path;
                  const hasFullPath = fullPath && (fullPath.includes('/') || fullPath.includes('\\')) && fullPath !== file.name;
                  if (hasFullPath) {
                    State.attachPath = fullPath;
                    State.attachBrowseHint = false;
                  } else {
                    State.attachPath = file.name;
                    State.attachBrowseHint = true;
                  }
                  e.target.value = '';
                  State.hashingError = '';
                  m.redraw();
                }
              },
            }),
            m('.attach-path-row', [
              m('input[type=text]', {
                placeholder: 'e.g. C:\\Downloads\\file.zip',
                value: State.attachPath,
                oninput: (e) => {
                  State.attachPath = e.target.value;
                  State.attachBrowseHint = false;
                },
                disabled: State.isHashing,
              }),
              m('button.attach-browse-btn', {
                type: 'button',
                disabled: State.isHashing,
                title: 'Browse for file',
                onclick: () => {
                  const picker = document.getElementById('direct-attach-file-picker');
                  if (picker) picker.click();
                },
              }, [m('i.fas.fa-folder-open'), m('span', ' Browse…')]),
            ]),
            State.attachBrowseHint && m('.attach-path-hint', [
              m('i.fas.fa-info-circle'),
              m('span', [
                ' Your browser cannot expose the full file path. ',
                m('strong', 'Edit the path above'),
                ' and add your folder prefix — e.g. change ',
                m('code', 'file.zip'),
                ' to ',
                m('code', 'C:\\Downloads\\file.zip'),
                ' — then click Attach.',
              ]),
            ]),
            State.isHashing && m('.hashing-spinner', [
              m('i.fas.fa-spinner.fa-spin'),
              m('span', ' Hashing file... Please wait.')
            ]),
            !State.attachBrowseHint && State.hashingError && m('p.error-text', State.hashingError),
            m('.modal-buttons', [
              m('button.btn.blue', {
                disabled: State.isHashing || !State.attachPath.trim() || State.attachBrowseHint,
                onclick: () => {
                  const path = State.attachPath.trim();
                  State.isHashing = true;
                  State.hashingError = '';
                  m.redraw();

                  rs.rsJsonApiRequest('/rsFiles/ExtraFileHash', {
                    localpath: path,
                    period: 86400 * 7,
                    flags: 0
                  }, (data, success) => {
                    if (success && data.retval) {
                      pollHashStatusForDirectChat(path);
                    } else {
                      State.isHashing = false;
                      State.hashingError = 'Failed to initiate file hashing. Check the path and try again.';
                      m.redraw();
                    }
                  });
                }
              }, [m('i.fas.fa-link'), m('span', ' Attach')]),
              m('button.btn.red', {
                disabled: State.isHashing,
                onclick: () => {
                  State.showAttachModal = false;
                  State.attachPath = '';
                  State.attachBrowseHint = false;
                  State.hashingError = '';
                }
              }, 'Cancel')
            ])
          ])
        ]),
      ]);
    },
  };
};

module.exports = ChatTab;
 
}); 
require.register("network/network_data", function(exports, require, module) { 
const rs = require('rswebui');

async function refreshIds() {
  let sslIds = [];
  await rs.rsJsonApiRequest('/rsPeers/getFriendList', {}, (data) => (sslIds = data.sslIds));
  return sslIds;
}

async function loadSslDetails() {
  const sslDetails = [];
  const sslIds = await refreshIds();
  await Promise.all(
    sslIds.map((sslId) =>
      rs.rsJsonApiRequest('/rsPeers/getPeerDetails', { sslId }, (data) => sslDetails.push(data.det))
    )
  );
  return sslDetails;
}

const Data = {
  gpgDetails: {},
};

function normalizeStatusValue(value, fallback) {
  if (value && typeof value === 'object') value = value.value ?? value.status ?? value.xint32;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    const names = { OFFLINE: 0, AWAY: 1, BUSY: 2, ONLINE: 3, INACTIVE: 4 };
    const match = Object.keys(names).find((name) => value.toUpperCase().includes(name));
    if (match) return names[match];
  }
  return fallback;
}

Data.getStatusPresentation = function (statusValue, isOnline = false) {
  const value = normalizeStatusValue(statusValue, isOnline ? 3 : 0);
  return {
    value,
    label: ['Offline', 'Away', 'Busy', 'Online', 'Inactive'][value] || (isOnline ? 'Online' : 'Offline'),
    color: ['#94a3b8', '#eab308', '#ef4444', '#10b981', '#f59e0b'][value] || '#94a3b8',
  };
};

Data.refreshGpgDetails = async function () {
  const details = {};
  const sslDetails = await loadSslDetails();
  await Promise.all(
    sslDetails.map((data) => {
      let isOnline = false;
      return rs
        .rsJsonApiRequest(
          '/rsPeers/isOnline',
          { sslId: data.id },
          (stat) => (isOnline = stat.retval)
        )
        .then(() => {
          let customState = '';
          let statusValue = isOnline ? 3 : 0;
          let statusTimestamp = 0;
          return rs
            .rsJsonApiRequest(
              '/rsChats/getCustomStateString',
              { peer_id: data.id },
              (statusData) => {
                if (statusData && statusData.retval) {
                  customState = statusData.retval;
                }
              }
            )
            .catch(() => {})
            .then(() => rs.rsJsonApiRequest(
              '/rsStatus/getStatus',
              { id: data.id },
              (statusData) => {
                if (statusData && statusData.retval && statusData.statusInfo) {
                  statusValue = normalizeStatusValue(statusData.statusInfo.status, statusValue);
                  statusTimestamp = statusData.statusInfo.time_stamp || 0;
                }
              }
            ).catch(() => {}))
            .then(() => {
              const avatar = '';
              return Promise.resolve()
                .then(() => {
                  const gpgId = (data.gpg_id || '').toLowerCase();
                  const loc = {
                    name: data.location,
                    id: data.id,
                    lastSeen: data.lastConnect,
                    isOnline,
                    gpg_id: gpgId,
                    customState,
                    statusValue,
                    statusTimestamp,
                    avatar,
                    peerDetails: data,
                  };

                  if (details[gpgId] === undefined) {
                    details[gpgId] = {
                      name: data.name,
                      fingerprint: data.fpr || '',
                      isSearched: true,
                      isOnline,
                      locations: [loc],
                      customState,
                      statusValue,
                      statusTimestamp,
                      avatar: avatar || '',
                    };
                  } else {
                    details[gpgId].locations.push(loc);
                    if (!details[gpgId].fingerprint && data.fpr) {
                      details[gpgId].fingerprint = data.fpr;
                    }
                    if (avatar) {
                      details[gpgId].avatar = avatar;
                    }
                    if (!details[gpgId].customState || (isOnline && customState)) {
                      details[gpgId].customState = customState;
                    }
                    if (isOnline || !details[gpgId].isOnline) {
                      details[gpgId].statusValue = statusValue;
                      details[gpgId].statusTimestamp = statusTimestamp;
                    }
                  }
                  details[gpgId].isOnline = details[gpgId].isOnline || isOnline;
                });
            });
        });
    })
  );

  Data.gpgDetails = details;
};
module.exports = Data;
 
}); 
require.register("network/network_details_tab", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const widget = require('widgets');
const Data = require('network/network_data');
const peopleUtil = require('people/people_util');
const { State, startDirectChat, getOnlineSslId } = require('network/network_state');

function formatFingerprint(fingerprint) {
  return String(fingerprint || '')
    .replace(/\s/g, '')
    .match(/.{1,4}/g)
    ?.join(' ') || '';
}

const ConfirmRemove = () => {
  return {
    view: (vnode) => [
      m('h3', 'Remove Friend'),
      m('hr'),
      m('p', 'Are you sure you want to end connections with this node?'),
      m(
        'button',
        {
          onclick: () => {
            rs.rsJsonApiRequest('/rsPeers/removeFriend', {
              pgpId: vnode.attrs.gpg_id,
            });
            State.selectedFriendGpgId = null;
            Data.refreshGpgDetails().then(() => m.redraw());
            widget.popupMessage(m('p', 'Friend removed successfully.'));
          },
        },
        'Confirm'
      ),
    ],
  };
};

//  Version and short invite of a node do not change while the web UI is open,
//  and the dialog is reopened often. Cached by node id so that reopening it
//  paints filled in, instead of showing "Loading..." and asking the core again.
const locationDetailsCache = {};

const LocationDetails = () => {
  let activeTab = 'details';
  let version = 'Loading...';
  let retroshareId = 'Loading...';

  return {
    oninit: (vnode) => {
      const nodeId = vnode.attrs.loc.id;
      const cached = locationDetailsCache[nodeId];
      if (cached) {
        version = cached.version;
        retroshareId = cached.retroshareId;
        return;
      }
      locationDetailsCache[nodeId] = { version, retroshareId };

      //  rsJsonApiRequest never rejects: it resolves undefined when the request
      //  fails, so the failure has to be read off the resolved value rather than
      //  waited for in a catch.
      rs.rsJsonApiRequest('/rsGossipDiscovery/getPeerVersion', { id: nodeId })
        .then((response) => {
          version = response && response.body && response.body.retval
            ? response.body.version || 'Unknown'
            : 'Unavailable';
          locationDetailsCache[nodeId].version = version;
          m.redraw();
        });
      rs.rsJsonApiRequest('/rsPeers/getShortInvite', { sslId: nodeId })
        .then((response) => {
          retroshareId = response && response.body && response.body.retval
            ? rs.cleanRetroshareId(response.body.invite) || 'Unavailable'
            : 'Unavailable';
          locationDetailsCache[nodeId].retroshareId = retroshareId;
          m.redraw();
        });
    },
    view: (vnode) => {
      const loc = vnode.attrs.loc;
      const detail = loc.peerDetails || {};
      const status = Data.getStatusPresentation(loc.statusValue, loc.isOnline);
      const knownAddresses = detail.ipAddressList || [];
      const infoRow = (label, value) => [
        m('.info-label', label),
        m('.info-value', value || 'None'),
      ];

      const detailContent = m('.info-grid', [
        infoRow('Profile', `${detail.name || 'Unknown'} (${loc.gpg_id})`),
        infoRow('Node ID', loc.id),
        infoRow('Node Name', loc.name),
        infoRow('Status', status.label),
        infoRow('Connection', detail.connectStateString || status.label),
        infoRow('Last Contact', new Date(loc.lastSeen * 1000).toLocaleString()),
        infoRow('RetroShare Version', version),
        infoRow('Status Message', loc.customState || 'None'),
      ]);
      const connectivityContent = [
        m('.info-grid', detail.isHiddenNode ? [
          infoRow('Hidden Address', detail.hiddenNodeAddress),
          infoRow('Port', detail.hiddenNodePort),
        ] : [
          infoRow('Local Address', detail.localAddr),
          infoRow('Local Port', detail.localPort),
          infoRow('External Address', detail.extAddr),
          infoRow('External Port', detail.extPort),
          infoRow('Dynamic DNS', detail.dyndns),
        ]),
        m('h4', `Known Addresses (${knownAddresses.length})`),
        knownAddresses.length
          ? m('pre.known-addresses-list', knownAddresses.join('\n'))
          : m('p', 'No address history available.'),
      ];
      const tabs = [
        ['details', 'Details'],
        ['connectivity', 'Connectivity'],
        ['retroshare-id', 'RetroShare ID'],
      ];

      return m('.location-details-dialog', [
        m('h3', `${detail.name || 'Profile'} (${loc.name || 'Location'})`),
        m('.network-tabs.location-detail-tabs', tabs.map(([id, label]) => m(
          `button.tab-btn${activeTab === id ? '.active' : ''}`,
          { onclick: () => (activeTab = id) },
          label
        ))),
        m('.location-detail-content',
          activeTab === 'details'
            ? detailContent
            : activeTab === 'connectivity'
              ? connectivityContent
              : m('pre.retroshare-id-text', retroshareId)
        ),
      ]);
    },
  };
};

const DetailsTab = () => {
  return {
    view: () => {
      const gpgId = State.selectedFriendGpgId;
      const friend = Data.gpgDetails[gpgId];
      if (!friend) return null;

      const friendGxsId = State.gpgToGxsIdMap[gpgId.toLowerCase()];
      const status = Data.getStatusPresentation(friend.statusValue, friend.isOnline);
      const fingerprint = formatFingerprint(friend.fingerprint);

      return m('.network-detail-view', [
        m('.detail-header', [
          m('.friend-avatar', m(peopleUtil.UserAvatar, {
            avatar: friend.avatar ? { mData: { base64: friend.avatar } } : undefined,
            firstLetter: (friend.name || '?').slice(0, 1).toUpperCase(),
            size: 128,
            seed: gpgId,
          })),
          m('.detail-title', [
            m('h2', friend.name),
            m('.detail-subtitle', [
              m('i.fas.fa-fingerprint'),
              m('span', 'GPG ID: ' + gpgId),
            ]),
            m('.detail-actions', { style: 'margin-top: 0.75rem;' }, [
              m(
                'button',
                {
                  onclick: () => {
                    const sslId = getOnlineSslId(gpgId);
                    if (sslId) {
                      State.activeTab = 'chat';
                      startDirectChat(sslId);
                    }
                  },
                },
                [m('i.fas.fa-comments'), m('span.btn-text', ' Start Chat')]
              ),
              m(
                'button',
                {
                  onclick: () => {
                    State.showMailCompose = true;
                  },
                },
                [m('i.fas.fa-envelope'), m('span.btn-text', ' Send Mail')]
              ),
            ]),
          ]),
        ]),

        m('.detail-section', [
          m('h3', 'Profile Info'),
          m('.info-grid', [
            m('.info-label', 'Status'),
            m(
              '.info-value',
              { style: `color: ${status.color}; font-weight: 600;` },
              status.label
            ),
            m('.info-label', 'Custom Status'),
            m(
              '.info-value',
              { style: 'font-style: italic; color: #64748b;' },
              friend.customState || 'None'
            ),
            friendGxsId ? [
              m('.info-label', 'GXS Identity'),
              m('.info-value', friendGxsId),
            ] : null,
            m('.info-label', 'Node GPG Key'),
            m('.info-value', gpgId),
            m('.info-label', 'PGP Fingerprint'),
            m('.info-value', fingerprint || 'Unavailable'),
          ]),
        ]),

        m('.detail-section', [
          m('h3', 'Locations (' + friend.locations.length + ')'),
          m(
            '.locations-grid',
            friend.locations
              .slice()
              .sort((a, b) => (a.isOnline === b.isOnline ? 0 : a.isOnline ? -1 : 1))
              .map((loc) => {
              const locStatus = Data.getStatusPresentation(loc.statusValue, loc.isOnline);
              return m('.location-card', { key: loc.id }, [
                m('.loc-header', [
                  m('.loc-name', loc.name),
                  m(
                    '.loc-status',
                    { style: { color: locStatus.color } },
                    locStatus.label
                  ),
                ]),
                m('.loc-body', [
                  m('.loc-label', 'SSL ID'),
                  m('.loc-val', loc.id),
                  m('.loc-label', 'Last Seen'),
                  m('.loc-val', new Date(loc.lastSeen * 1000).toLocaleString()),
                ]),
                m('.loc-footer', [
                  m(
                    'button',
                    {
                      onclick: () => widget.popupMessage(
                        m(LocationDetails, { loc }),
                        'location-details-modal'
                      ),
                    },
                    [m('i.fas.fa-info-circle'), ' View Details']
                  ),
                  m(
                    'button.red',
                    {
                      onclick: () =>
                        widget.popupMessage(
                          m(ConfirmRemove, {
                            gpg_id: loc.gpg_id,
                          })
                        ),
                    },
                    'Remove Location'
                  ),
                ]),
              ]);
            })
          ),
        ]),
      ]);
    },
  };
};

module.exports = DetailsTab;
 
}); 
require.register("network/network_friends_list", function(exports, require, module) { 
const m = require('mithril');
const Data = require('network/network_data');
const peopleUtil = require('people/people_util');
const {
  State,
  startDirectChat,
  getOnlineSslId,
  setOwnCustomStateString,
  setOwnStatus,
} = require('network/network_state');

function formatRelativeTime(ts) {
  if (!ts) return '';
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ts;
  if (diff < 30) return 'Just Now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min${Math.floor(diff / 60) > 1 ? 's' : ''}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr${Math.floor(diff / 3600) > 1 ? 's' : ''}`;
  return `${Math.floor(diff / 86400)} d`;
}

const OwnProfileCard = () => {
  let isEditing = false;
  let isPresenceMenuOpen = false;
  let statusInputText = '';

  return {
    view: () => {
      const avatar = State.ownProfile.avatar ? { mData: { base64: State.ownProfile.avatar } } : undefined;
      const firstLetter = (State.ownProfile.name || 'U').slice(0, 1).toUpperCase();
      const displayName = State.ownProfile.location
        ? `${State.ownProfile.name || 'Unknown'} (${State.ownProfile.location})`
        : State.ownProfile.name || 'Loading...';
      const status = Data.getStatusPresentation(State.ownProfile.statusValue, true);

      return m('.own-profile-card', [
        m('.profile-header', [
          m('.profile-avatar-wrapper', [
            m(peopleUtil.UserAvatar, { avatar, firstLetter, seed: State.ownProfile.name }),
            m('button.status-dot.profile-status-button', {
              'aria-label': `Change status. Current status: ${status.label}`,
              'aria-expanded': String(isPresenceMenuOpen),
              style: { backgroundColor: status.color },
              title: `Status: ${status.label}. Click to change.`,
              onclick: () => {
                isPresenceMenuOpen = !isPresenceMenuOpen;
              },
            }),
            isPresenceMenuOpen && m('.profile-presence-menu', [
              [
                { value: 3, label: 'Online' },
                { value: 1, label: 'Away' },
                { value: 2, label: 'Busy' },
              ].map((option) => {
                const optionStatus = Data.getStatusPresentation(option.value, true);
                return m('button.profile-presence-option', {
                  class: status.value === option.value ? 'active' : '',
                  onclick: () => {
                    setOwnStatus(option.value);
                    isPresenceMenuOpen = false;
                  },
                }, [
                  m('span', { style: { backgroundColor: optionStatus.color } }),
                  option.label,
                  status.value === option.value && m('i.fas.fa-check'),
                ]);
              }),
            ]),
          ]),
          m('.profile-info', [
            m('.profile-name', { title: displayName }, displayName),
            isEditing
              ? m('.profile-custom-status-edit', {
                  style: 'display: flex; align-items: center; gap: 4px; margin-top: 3px;'
                }, [
                  m('input[type=text]', {
                    value: statusInputText,
                    placeholder: 'Set custom status...',
                    style: 'font-size: 0.8rem; padding: 2px 6px; border: 1px solid #3ba4d7; border-radius: 4px; width: 125px; outline: none; background: #ffffff;',
                    oninput: (e) => { statusInputText = e.target.value; },
                    onkeydown: (e) => {
                      if (e.key === 'Enter') {
                        setOwnCustomStateString(statusInputText);
                        isEditing = false;
                      } else if (e.key === 'Escape') {
                        isEditing = false;
                      }
                    },
                    oncreate: (vnode) => vnode.dom.focus(),
                  }),
                  m('i.fas.fa-check', {
                    style: 'cursor: pointer; color: #10b981; font-size: 0.85rem; padding: 2px;',
                    title: 'Save status',
                    onclick: () => {
                      setOwnCustomStateString(statusInputText);
                      isEditing = false;
                    },
                  }),
                  m('i.fas.fa-times', {
                    style: 'cursor: pointer; color: #ef4444; font-size: 0.85rem; padding: 2px;',
                    title: 'Cancel',
                    onclick: () => {
                      isEditing = false;
                    },
                  }),
                ])
              : m(
                  '.profile-custom-status',
                  {
                    style: State.ownProfile.customState
                      ? 'font-size: 0.825rem; color: #64748b; font-style: italic; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 180px; cursor: pointer; margin-top: 2px;'
                      : 'font-size: 0.825rem; color: #94a3b8; font-style: italic; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 180px; cursor: pointer; margin-top: 2px;',
                    title: 'Edit status message',
                    onclick: () => {
                      statusInputText = State.ownProfile.customState || '';
                      isEditing = true;
                    },
                  },
                  State.ownProfile.customState || 'Set custom status...'
                ),
          ]),
        ]),
      ]);
    },
  };
};

const FriendsList = () => {
  return {
    view: () => {
      const search = State.searchString.toLowerCase();
      const allGpgEntries = Object.entries(Data.gpgDetails || {});

      // Compute active chats count
      let activeChatsCount = 0;
      allGpgEntries.forEach(([gpgId]) => {
        const hist = State.chatHistoryMap && State.chatHistoryMap[gpgId];
        if (hist && hist.lastMsg) {
          activeChatsCount++;
        }
      });

      let displayFriends;

      if (State.mainTab === 'network') {
        displayFriends = allGpgEntries.filter(([gpgId, friend]) =>
          (friend.name || '').toLowerCase().includes(search)
        );
        displayFriends.sort((a, b) =>
          a[1].isOnline === b[1].isOnline ? 0 : a[1].isOnline ? -1 : 1
        );
      } else {
        // Chats Tab: filter friends with chat history
        displayFriends = allGpgEntries.filter(([gpgId, friend]) => {
          const hist = State.chatHistoryMap && State.chatHistoryMap[gpgId];
          if (!hist || !hist.lastMsg) return false;
          return (friend.name || '').toLowerCase().includes(search);
        });

        displayFriends.sort((a, b) => {
          const histA = State.chatHistoryMap[a[0]];
          const histB = State.chatHistoryMap[b[0]];
          const timeA = histA ? histA.lastTime : 0;
          const timeB = histB ? histB.lastTime : 0;
          return timeB - timeA;
        });
      }

      return m('.friends-list-container', [
        m('.people-sidebar-header', [
          m('.searchbar-wrapper', [
            m('i.fas.fa-search'),
            m('input.searchbar-input', {
              type: 'text',
              placeholder: State.mainTab === 'network' ? 'Search friends...' : 'Search chats...',
              value: State.searchString,
              oninput: (e) => {
                State.searchString = e.target.value;
              },
            }),
          ]),
          m('.segmented-control', [
            m(
              'button.segment-tab' + (State.mainTab === 'network' ? '.active' : ''),
              {
                onclick: () => {
                  State.mainTab = 'network';
                },
              },
              [m('i.fas.fa-users'), ' Network']
            ),
            m(
              'button.segment-tab' + (State.mainTab === 'chats' ? '.active' : ''),
              {
                onclick: () => {
                  State.mainTab = 'chats';
                },
              },
              [
                m('i.fas.fa-comments'),
                ' Chats',
                activeChatsCount > 0 && m('span.segment-badge', activeChatsCount),
              ]
            ),
          ]),
        ]),
        m('.friends-scroll', [
          displayFriends.length === 0
            ? m(
                'p',
                { style: 'padding: 1rem; color: #94a3b8; text-align: center;' },
                State.mainTab === 'network' ? 'No friends found' : 'No active chats found'
              )
            : displayFriends.map(([gpgId, friend]) => {
                const avatar = friend.avatar ? { mData: { base64: friend.avatar } } : undefined;
                const firstLetter = (friend.name || '?').slice(0, 1).toUpperCase();
                const isSelected = State.selectedFriendGpgId === gpgId;
                const hist = State.chatHistoryMap && State.chatHistoryMap[gpgId];
                const status = Data.getStatusPresentation(friend.statusValue, friend.isOnline);

                const isOnlineOrActive = friend.isOnline || (status && status.value > 0);

                if (State.mainTab === 'chats') {
                  // Render Chat List Item
                  return m(
                    `.chat-item${isSelected ? '.selected' : ''}`,
                    {
                      key: gpgId,
                      onclick: () => {
                        State.selectedFriendGpgId = gpgId;
                        State.activeTab = 'chat';
                        const sslId = getOnlineSslId(gpgId);
                        if (sslId) startDirectChat(sslId);
                      },
                    },
                    [
                      m('.chat-avatar-wrapper', [
                        m(peopleUtil.UserAvatar, { avatar, firstLetter, seed: gpgId }),
                        m('.status-dot', {
                          style: {
                            backgroundColor: status.color,
                          },
                          title: status.label,
                        }),
                      ]),
                      m('.chat-info', [
                        m(
                          '.chat-name',
                          {
                            style: isOnlineOrActive ? { color: status.color, fontWeight: '700' } : {},
                          },
                          friend.name
                        ),
                        m('.chat-last-msg', hist ? hist.lastMsg : ''),
                      ]),
                      m('.chat-meta', [
                        hist && hist.lastTime && m('.chat-time', formatRelativeTime(hist.lastTime)),
                      ]),
                    ]
                  );
                }

                // Render Network Friend List Item
                return m(
                  `.friend-list-item${isSelected ? '.selected' : ''}`,
                  {
                    key: gpgId,
                    onclick: () => {
                      State.selectedFriendGpgId = gpgId;
                      State.currentChatPeerId = null;
                      State.chatMessages = [];
                      if (State.activeTab === 'chat') {
                        const sslId = getOnlineSslId(gpgId);
                        if (sslId) startDirectChat(sslId);
                      }
                    },
                  },
                  [
                    m('.friend-avatar', [
                      m(peopleUtil.UserAvatar, { avatar, firstLetter, seed: gpgId }),
                      m('.status-dot', {
                        style: { backgroundColor: status.color },
                        title: status.label,
                      }),
                    ]),
                    m('.friend-meta', [
                      m(
                        '.friend-name',
                        {
                          style: isOnlineOrActive ? { color: status.color, fontWeight: '700' } : {},
                        },
                        friend.name
                      ),
                      friend.customState &&
                        m(
                          '.friend-custom-status',
                          {
                            style:
                              'font-size: 0.85rem; color: #64748b; margin-top: 2px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 180px;',
                            title: friend.customState,
                          },
                          friend.customState
                        ),
                    ]),
                  ]
                );
              }),
        ]),
      ]);
    },
  };
};

module.exports = {
  OwnProfileCard,
  FriendsList,
};
 
}); 
require.register("network/network_graph", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const Data = require('network/network_data');
const { State } = require('network/network_state');

const WIDTH = 1000;
const HEIGHT = 650;
const NODE_LIMIT = 200;

function friendIdsFrom(response) {
  const body = (response && response.body) || {};
  const values = body.gpg_friends || body.gpgFriends || body.friends ||
    (Array.isArray(body.retval) ? body.retval : []);
  return Array.isArray(values) ? values.map(String).filter(Boolean) : [];
}

function uniqueEdgeKey(a, b) {
  return [a, b].sort().join('|');
}

function initialPosition(index, count, level) {
  if (level === 0) return { x: WIDTH / 2, y: HEIGHT / 2 };
  const angle = (index / Math.max(count, 1)) * Math.PI * 2;
  const radius = level === 1 ? 190 : 285;
  return {
    x: WIDTH / 2 + Math.cos(angle) * radius,
    y: HEIGHT / 2 + Math.sin(angle) * radius,
  };
}

function layoutGraph(nodes, edges, edgeLength) {
  const positions = {};
  const byLevel = [0, 1, 2].map((level) => nodes.filter((node) => node.level === level));
  byLevel.forEach((levelNodes, level) => {
    levelNodes.forEach((node, index) => {
      positions[node.id] = initialPosition(index, levelNodes.length, level);
    });
  });

  const own = nodes.find((node) => node.level === 0);
  for (let iteration = 0; iteration < 140; iteration++) {
    const force = Object.fromEntries(nodes.map((node) => [node.id, { x: 0, y: 0 }]));

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = positions[nodes[i].id];
        const b = positions[nodes[j].id];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        const distanceSq = Math.max(dx * dx + dy * dy, 100);
        const distance = Math.sqrt(distanceSq);
        const strength = 2400 / distanceSq;
        dx /= distance;
        dy /= distance;
        force[nodes[i].id].x += dx * strength;
        force[nodes[i].id].y += dy * strength;
        force[nodes[j].id].x -= dx * strength;
        force[nodes[j].id].y -= dy * strength;
      }
    }

    edges.forEach((edge) => {
      const a = positions[edge.source];
      const b = positions[edge.target];
      if (!a || !b) return;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const strength = (distance - edgeLength) * 0.012;
      force[edge.source].x += (dx / distance) * strength;
      force[edge.source].y += (dy / distance) * strength;
      force[edge.target].x -= (dx / distance) * strength;
      force[edge.target].y -= (dy / distance) * strength;
    });

    nodes.forEach((node) => {
      if (own && node.id === own.id) return;
      const position = positions[node.id];
      position.x = Math.max(35, Math.min(WIDTH - 35, position.x + force[node.id].x));
      position.y = Math.max(35, Math.min(HEIGHT - 35, position.y + force[node.id].y));
    });
  }
  return positions;
}

//  Module level, not fields of the component: the graph tab is mounted only
//  while it is the active tab, so leaving it and coming back rebuilds the
//  component. Kept here, a return to the tab shows the graph that was already
//  computed -- instead of replaying the discovery requests and a layout that
//  costs up to 729 ms -- and the zoom, the search and the level are still what
//  the user left them at.
let nodes = [];
let edges = [];
let positions = {};
let loading = true;
let error = '';
let friendshipLevel = 1;
let edgeLength = 105;
let zoom = 1;
let search = '';
let loadedAt = 0;
//  A newer load makes an older one drop its results instead of writing them
//  over the fresh ones: changing the friendship level while a load is running
//  starts a second one, and they do not necessarily finish in order.
let loadToken = 0;
const GRAPH_CACHE_MS = 60000;

const NetworkGraph = () => {
  let draggedId = null;

  async function discoveredFriends(id) {
    try {
      return friendIdsFrom(
        await rs.rsJsonApiRequest('/rsGossipDiscovery/getDiscPgpFriends', { pgpid: id })
      );
    } catch (_) {
      return [];
    }
  }

  //  A browser opens about six connections per host: asking for two hundred
  //  discoveries at once does not make them arrive sooner, it just queues them
  //  all in the tab and, past a certain point, starts failing them outright --
  //  the request storm that made the channel list unusable. Six at a time.
  async function discoverInBatches(ids, size = 6) {
    const relations = [];
    for (let i = 0; i < ids.length; i += size) {
      const slice = ids.slice(i, i + size);
      relations.push(...await Promise.all(
        slice.map(async (id) => [id, await discoveredFriends(id)])
      ));
    }
    return relations;
  }

  async function loadGraph() {
    const token = ++loadToken;
    loading = true;
    error = '';
    const ownId = State.ownProfile.gpg_id;
    if (!ownId) {
      loading = false;
      error = 'Your network identity is still loading. Try redraw in a moment.';
      m.redraw();
      return;
    }

    const directIds = Object.keys(Data.gpgDetails || {}).filter(Boolean);
    const levels = new Map([[ownId, 0]]);
    directIds.forEach((id) => levels.set(id, 1));
    const adjacency = new Map([[ownId, directIds]]);

    const directRelations = await discoverInBatches(directIds);
    if (token !== loadToken) return;
    directRelations.forEach(([id, friends]) => {
      adjacency.set(id, friends);
      if (friendshipLevel > 1) {
        friends.forEach((friendId) => {
          if (!levels.has(friendId) && levels.size < NODE_LIMIT) levels.set(friendId, 2);
        });
      }
    });

    if (friendshipLevel > 1) {
      const secondLevelIds = Array.from(levels).filter(([, level]) => level === 2).map(([id]) => id);
      const secondRelations = await discoverInBatches(secondLevelIds);
      if (token !== loadToken) return;
      secondRelations.forEach(([id, friends]) => adjacency.set(id, friends));
    }

    nodes = Array.from(levels, ([id, level]) => {
      const friend = Data.gpgDetails[id];
      return {
        id,
        level,
        name: level === 0
          ? State.ownProfile.name || 'You'
          : (friend && friend.name) || `${id.slice(0, 10)}…`,
        online: level === 0 || Boolean(friend && friend.isOnline),
      };
    });

    const edgeKeys = new Set();
    edges = [];
    adjacency.forEach((friends, source) => {
      friends.forEach((target) => {
        if (!levels.has(source) || !levels.has(target) || source === target) return;
        const key = uniqueEdgeKey(source, target);
        if (edgeKeys.has(key)) return;
        edgeKeys.add(key);
        edges.push({ source, target });
      });
    });

    positions = layoutGraph(nodes, edges, edgeLength);
    loadedAt = Date.now();
    loading = false;
    m.redraw();
  }

  function redrawLayout() {
    positions = layoutGraph(nodes, edges, edgeLength);
  }

  function setZoom(value) {
    zoom = Math.max(0.5, Math.min(2.5, Number(value)));
  }

  function pointerPosition(event) {
    const svg = event.currentTarget.ownerSVGElement || event.currentTarget;
    const bounds = svg.getBoundingClientRect();
    const rawX = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
    const rawY = ((event.clientY - bounds.top) / bounds.height) * HEIGHT;
    return {
      x: WIDTH / 2 + (rawX - WIDTH / 2) / zoom,
      y: HEIGHT / 2 + (rawY - HEIGHT / 2) / zoom,
    };
  }

  return {
    oninit: () => {
      if (nodes.length === 0 || Date.now() - loadedAt > GRAPH_CACHE_MS) loadGraph();
    },
    view: () => m('.network-graph', [
      m('.network-graph__toolbar', [
        m('button[type=button]', { onclick: loadGraph, disabled: loading }, [
          m('i.fas.fa-sync-alt', { class: loading ? 'fa-spin' : '' }),
          ' Redraw',
        ]),
        m('label', [
          'Friendship level',
          m('select', {
            value: friendshipLevel,
            onchange: (event) => {
              friendshipLevel = Number(event.target.value);
              loadGraph();
            },
          }, [m('option[value=1]', '1'), m('option[value=2]', '2')]),
        ]),
        m('label.network-graph__edge-control', [
          `Edge length ${edgeLength}`,
          m('input[type=range][min=60][max=180][step=5]', {
            value: edgeLength,
            //  The label follows the slider, the layout waits for the release:
            //  layoutGraph() is 140 iterations of an O(n^2) force loop, which
            //  measures 24 ms at 20 nodes, 199 ms at 100 and 729 ms at the 200
            //  node cap. A range input fires oninput dozens of times per drag,
            //  each one blocking the main thread for that long.
            oninput: (event) => {
              edgeLength = Number(event.target.value);
            },
            onchange: redrawLayout,
          }),
        ]),
        m('.network-graph__zoom-control', [
          m('button[type=button][title=Zoom out][aria-label=Zoom out]', {
            onclick: () => setZoom(zoom - 0.1),
          }, m('i.fas.fa-minus')),
          m('label', [
            `Zoom ${Math.round(zoom * 100)}%`,
            m('input[type=range][min=0.5][max=2.5][step=0.1]', {
              value: zoom,
              oninput: (event) => setZoom(event.target.value),
            }),
          ]),
          m('button[type=button][title=Zoom in][aria-label=Zoom in]', {
            onclick: () => setZoom(zoom + 0.1),
          }, m('i.fas.fa-plus')),
          m('button[type=button][title=Reset zoom]', {
            onclick: () => setZoom(1),
          }, '100%'),
        ]),
        m('.network-graph__search', [
          m('i.fas.fa-search'),
          m('input[type=search][placeholder=Find a peer…]', {
            value: search,
            oninput: (event) => (search = event.target.value),
          }),
        ]),
      ]),
      loading
        ? m('.network-graph__message', [m('i.fas.fa-spinner.fa-spin'), ' Loading network graph…'])
        : error
          ? m('.network-graph__message.network-graph__message--error', error)
          : m('svg.network-graph__canvas', {
              viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
              role: 'img',
              'aria-label': `Network graph with ${nodes.length} peers and ${edges.length} connections`,
              onwheel: (event) => {
                event.preventDefault();
                setZoom(zoom + (event.deltaY < 0 ? 0.1 : -0.1));
              },
              onpointermove: (event) => {
                if (!draggedId) return;
                positions[draggedId] = pointerPosition(event);
              },
              onpointerup: () => (draggedId = null),
              onpointerleave: () => (draggedId = null),
            }, m('g.network-graph__zoom-layer', {
              transform: `translate(${WIDTH / 2} ${HEIGHT / 2}) scale(${zoom}) translate(${-WIDTH / 2} ${-HEIGHT / 2})`,
            }, [
              m('g.network-graph__edges', edges.map((edge) => {
                const source = positions[edge.source];
                const target = positions[edge.target];
                return source && target && m('line', {
                  x1: source.x, y1: source.y, x2: target.x, y2: target.y,
                });
              })),
              m('g.network-graph__nodes', nodes.map((node) => {
                const position = positions[node.id];
                const matches = search && node.name.toLowerCase().includes(search.toLowerCase());
                const color = node.level === 0 ? '#d6d91f' : node.online ? '#16a34a' : '#64748b';
                return m('g.network-graph__node', {
                  class: matches ? 'is-match' : '',
                  transform: `translate(${position.x} ${position.y})`,
                  onpointerdown: (event) => {
                    draggedId = node.id;
                    event.currentTarget.setPointerCapture(event.pointerId);
                  },
                }, [
                  m('title', `${node.name}\n${node.id}`),
                  m('circle', { r: node.level === 0 ? 13 : 10, fill: color }),
                  m('text', { x: 14, y: 4 }, node.name),
                ]);
              })),
            ])),
      !loading && !error && m('.network-graph__legend', [
        m('span', [m('i.network-graph__key.network-graph__key--own'), ' You']),
        m('span', [m('i.network-graph__key.network-graph__key--online'), ' Online']),
        m('span', [m('i.network-graph__key.network-graph__key--offline'), ' Offline / discovered']),
        m('span', `${nodes.length} peers · ${edges.length} connections`),
      ]),
    ]),
  };
};

module.exports = NetworkGraph;
 
}); 
require.register("network/network_state", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const Data = require('network/network_data');
const peopleUtil = require('people/people_util');

const State = {
  ownProfile: {
    name: 'Loading...',
    location: '',
    ssl_id: '',
    gpg_id: '',
    customState: '',
    statusValue: 3,
    statusTimestamp: 0,
    avatar: '',
  },
  ownGxsIds: [],
  selectedOwnGxsId: '',
  selectedOwnGxsDetails: null,
  selectedFriendGpgId: null,
  mainTab: 'network', // 'network' | 'chats'
  activeTab: 'details', // 'details' | 'chat' | 'graph'
  searchString: '',
  gpgToGxsIdMap: {},
  gxsIdToDetailsMap: {},
  gxsIdentities: [],
  chatHistoryMap: {}, // gpgId -> { lastMsg, lastTime }
  currentChatPeerId: null,
  chatMessages: [],
  chatInputMsg: '',
  showMailCompose: false,
  showAttachModal: false,
  attachPath: '',
  attachBrowseHint: false,
  isHashing: false,
  hashingError: '',
  showEmojiPicker: false,
  showHistoryModal: false,
  historySearchQuery: '',
  fullHistoryMessages: [],
  isHistoryLoading: false,
};

function loadOwnProfile() {
  rs.rsJsonApiRequest('/rsStatus/getOwnStatus', {}, (statusData) => {
    if (statusData && statusData.retval && statusData.statusInfo) {
      State.ownProfile.statusValue = statusData.statusInfo.status;
      State.ownProfile.statusTimestamp = statusData.statusInfo.time_stamp || 0;
      m.redraw();
    }
  }).catch(() => {});

  const fetchOwnCustomState = () => {
    rs.rsJsonApiRequest('/rsChats/getOwnCustomStateString', {}, (statusData) => {
      if (statusData) {
        let customState;
        if (typeof statusData.retval === 'string') {
          customState = statusData.retval;
        } else if (typeof statusData === 'string') {
          customState = statusData;
        } else if (statusData.retval && typeof statusData.retval === 'object') {
          customState =
            statusData.retval.status ||
            statusData.retval.customState ||
            statusData.retval.custom_state ||
            statusData.retval.status_string ||
            '';
        } else {
          customState =
            statusData.customState ||
            statusData.custom_state ||
            statusData.status ||
            statusData.status_string ||
            statusData.ownCustomStateString ||
            '';
        }
        State.ownProfile.customState = customState;
        m.redraw();
      }
    }).catch(() => {
      if (State.ownProfile.ssl_id) {
        rs.rsJsonApiRequest(
          '/rsChats/getCustomStateString',
          { peer_id: State.ownProfile.ssl_id },
          (statusData) => {
            if (statusData) {
              const customState =
                typeof statusData.retval === 'string'
                  ? statusData.retval
                  : statusData.customState || statusData.custom_state || statusData.status || '';
              State.ownProfile.customState = customState;
              m.redraw();
            }
          }
        ).catch(() => {});
      }
    });
  };

  fetchOwnCustomState();

  rs.rsJsonApiRequest('/rsConfig/getConfigNetStatus', {}, (data) => {
    if (data && data.status) {
      State.ownProfile.name = data.status.ownName || 'Unknown';
      State.ownProfile.ssl_id = data.status.ownId || '';

      if (State.ownProfile.ssl_id) {
        fetchOwnCustomState();

        rs.rsJsonApiRequest('/rsPeers/getPeerDetails', { sslId: State.ownProfile.ssl_id }, (detData) => {
          if (detData && detData.det) {
            State.ownProfile.gpg_id = detData.det.gpg_id || '';
            State.ownProfile.location = detData.det.location || '';
            m.redraw();
          }
        });

        /* Disabled getAvatar API call to avoid 404 network errors
        rs.rsJsonApiRequest('/rsChats/getAvatar', { pid: State.ownProfile.ssl_id }, (avatarData) => {
          if (avatarData && avatarData.retval && avatarData.avatar_base64_string) {
            State.ownProfile.avatar = avatarData.avatar_base64_string;
            m.redraw();
          }
        });
        */
      }
      m.redraw();
    }
  });

  peopleUtil.ownIds((ids) => {
    if (ids) {
      State.ownGxsIds = ids.filter(
        (id) => id && id !== '0000000000000000' && Number(id) !== 0
      );
      if (State.ownGxsIds.length > 0 && !State.selectedOwnGxsId) {
        State.selectedOwnGxsId = State.ownGxsIds[0];
        loadSelectedOwnGxsDetails();
      }
      m.redraw();
    }
  });
}

function loadSelectedOwnGxsDetails() {
  if (!State.selectedOwnGxsId) return;
  rs.rsJsonApiRequest(
    '/rsIdentity/getIdDetails',
    { id: State.selectedOwnGxsId },
    (data) => {
      if (data && data.details) {
        State.selectedOwnGxsDetails = data.details;
        m.redraw();
      }
    }
  );
}

function fetchIdDetails(gxsId) {
  if (!gxsId) return;
  if (State.gxsIdToDetailsMap[gxsId] === undefined) {
    State.gxsIdToDetailsMap[gxsId] = null;
    rs.rsJsonApiRequest('/rsIdentity/getIdDetails', { id: gxsId }, (detData) => {
      if (detData && detData.details) {
        State.gxsIdToDetailsMap[gxsId] = detData.details;
        const pgpId = detData.details.mPgpId;
        if (pgpId && pgpId !== '0000000000000000') {
          State.gpgToGxsIdMap[pgpId.toLowerCase()] = gxsId;
        }
        m.redraw();
      }
    });
  }
}

function loadGxsIdentities() {
  rs.rsJsonApiRequest('/rsIdentity/getIdentitiesSummaries', {}, (data) => {
    if (data && data.ids) {
      State.gxsIdentities = data.ids.map((u) => u.mGroupId);
      m.redraw();
    }
  });
}

function startDirectChat(sslId) {
  State.currentChatPeerId = sslId;
  State.chatMessages = [];
  loadDirectChatMessages();
  loadRecentDirectChatHistory();
}

function getOnlineSslId(gpgId) {
  const friend = Data.gpgDetails[gpgId];
  if (!friend || !friend.locations || friend.locations.length === 0) return null;
  const onlineLoc = friend.locations.find((loc) => loc.isOnline);
  return onlineLoc ? onlineLoc.id : friend.locations[0].id;
}

function isSystemMsg(msg) {
  if (!msg) return false;
  const str = String(msg);
  return (
    str.includes('Distant chat requested') ||
    str.includes('Distant chat established') ||
    str.includes('Distant chat closed') ||
    str.includes('Distant chat status')
  );
}

function preloadNetworkChatHistory() {
  const gpgIds = Object.keys(Data.gpgDetails || {});
  gpgIds.forEach((gpgId) => {
    if (!gpgId || gpgId === '0000000000000000') return;

    const privatePeerId = {
      broadcast_status_peer_id: '00000000000000000000000000000000',
      type: 1, // PRIVATE
      peer_id: gpgId,
      distant_chat_id: '00000000000000000000000000000000',
      lobby_id: { xstr64: '0' },
    };

    rs.rsJsonApiRequest(
      '/rsHistory/getMessages',
      {
        chatPeerId: privatePeerId,
        loadCount: 20,
      },
      (msgData, success) => {
        if (success && msgData && msgData.msgs) {
          const userMsgs = msgData.msgs.filter(
            (m) => !m.isSystem && !isSystemMsg(m.message || m.msg)
          );
          if (userMsgs.length > 0) {
            const last = userMsgs[userMsgs.length - 1];
            State.chatHistoryMap[gpgId] = {
              lastMsg: last.message || last.msg || '',
              lastTime: last.sendTime || last.recvTime || Math.floor(Date.now() / 1000),
            };
            m.redraw();
          }
        }
      }
    );
  });
}

function loadDirectChatMessages() {
  rs.events[15].notify = (chatMessage) => {
    const messagePeerId = chatMessage.chat_id && chatMessage.chat_id.peer_id
      ? rs.idToHex(chatMessage.chat_id.peer_id)
      : '';
    if (
      chatMessage.chat_id &&
      chatMessage.chat_id.type === 1 &&
      messagePeerId === State.currentChatPeerId
    ) {
      State.chatMessages.push(chatMessage);
      if (State.selectedFriendGpgId) {
        State.chatHistoryMap[State.selectedFriendGpgId] = {
          lastMsg: chatMessage.msg || chatMessage.message || '',
          lastTime: chatMessage.sendTime || chatMessage.recvTime || Math.floor(Date.now() / 1000),
        };
      }
      m.redraw();
      scrollChatToBottom();
    }
  };
}

function directChatId(peerId) {
  return {
    broadcast_status_peer_id: '00000000000000000000000000000000',
    type: 1,
    peer_id: peerId,
    distant_chat_id: '00000000000000000000000000000000',
    lobby_id: { xstr64: '0' },
  };
}

function mergeDirectChatMessages(messages) {
  const unique = new Map();
  messages.forEach((message) => {
    const text = message.msg || message.message || '';
    const time = message.sendTime || message.recvTime || 0;
    const incoming = message.incoming === true;
    unique.set(`${time}_${incoming}_${text}`, message);
  });
  return Array.from(unique.values()).sort(
    (a, b) => (a.sendTime || a.recvTime || 0) - (b.sendTime || b.recvTime || 0)
  );
}

function loadRecentDirectChatHistory() {
  const peerId = State.currentChatPeerId;
  if (!peerId) return;
  rs.rsJsonApiRequest('/rsHistory/getMessages', {
    chatPeerId: directChatId(peerId),
    loadCount: 20,
  }, (data, success) => {
    if (peerId !== State.currentChatPeerId) return;
    if (success && data && Array.isArray(data.msgs)) {
      State.chatMessages = mergeDirectChatMessages(data.msgs.concat(State.chatMessages));
      m.redraw();
      scrollChatToBottom();
    }
  });
}

function loadAllDirectChatHistory() {
  const peerId = State.currentChatPeerId;
  if (!peerId) return;
  State.isHistoryLoading = true;
  State.fullHistoryMessages = [];
  m.redraw();
  rs.rsJsonApiRequest('/rsHistory/getMessages', {
    chatPeerId: directChatId(peerId),
    loadCount: 0,
  }, (data, success) => {
    if (peerId !== State.currentChatPeerId) return;
    State.fullHistoryMessages = success && data && Array.isArray(data.msgs)
      ? mergeDirectChatMessages(data.msgs)
      : [];
    State.isHistoryLoading = false;
    m.redraw();
  });
}

function sendDirectChatMessage() {
  if (!State.chatInputMsg.trim() || !State.currentChatPeerId) return;

  const msg = State.chatInputMsg;
  State.chatInputMsg = '';

  rs.rsJsonApiRequest(
    '/rsChats/sendChat',
    {
      id: { type: 1, peer_id: State.currentChatPeerId },
      msg,
    },
    (data, success) => {
      if (success) {
        const nowSec = Math.floor(Date.now() / 1000);
        State.chatMessages.push({
          chat_id: { type: 1, peer_id: State.currentChatPeerId },
          msg,
          sendTime: nowSec,
          incoming: false,
          own: true,
        });

        if (State.selectedFriendGpgId) {
          State.chatHistoryMap[State.selectedFriendGpgId] = {
            lastMsg: msg,
            lastTime: nowSec,
          };
        }
        m.redraw();
        scrollChatToBottom();
      } else {
        console.error('[RS] Failed to send direct chat message');
      }
    }
  );
}

function scrollChatToBottom() {
  setTimeout(() => {
    const el = document.getElementById('chat-messages-container');
    if (el) el.scrollTop = el.scrollHeight;
  }, 100);
}

function setOwnCustomStateString(statusString) {
  const str = (statusString || '').trim();
  rs.rsJsonApiRequest('/rsChats/setCustomStateString', { status_string: str }, () => {
    State.ownProfile.customState = str;
    m.redraw();
  }).catch(() => {
    State.ownProfile.customState = str;
    m.redraw();
  });
}

async function setOwnStatus(statusValue) {
  const value = Number(statusValue);
  if (![1, 2, 3].includes(value)) return false;

  try {
    const response = await rs.rsJsonApiRequest('/rsStatus/sendStatus', { status: value });
    if (response && response.body && response.body.retval === false) return false;

    State.ownProfile.statusValue = value;
    State.ownProfile.statusTimestamp = Math.floor(Date.now() / 1000);
    m.redraw();
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  State,
  loadOwnProfile,
  setOwnCustomStateString,
  setOwnStatus,
  loadSelectedOwnGxsDetails,
  fetchIdDetails,
  loadGxsIdentities,
  startDirectChat,
  getOnlineSslId,
  preloadNetworkChatHistory,
  loadDirectChatMessages,
  loadRecentDirectChatHistory,
  loadAllDirectChatHistory,
  sendDirectChatMessage,
  scrollChatToBottom,
};
 
}); 
require.register("people/people", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const Data = require('network/network_data');
const compose = require('mail/mail_compose');
const {
  State,
  fetchIdDetails,
  loadGxsIdentities,
  loadOwnGxsIds,
  preloadAllChatHistory,
  syncFilter,
  startStatusPolling,
  stopStatusPolling,
  initializeDistantChat,
} = require('people/people_state');

const PeopleSidebar = require('people/people_sidebar');
const DetailsTab = require('people/people_details_tab');
const ChatTab = require('people/people_chat_tab');

const PeopleLayout = () => {
  const dismissMenu = () => {
    if (State.activeMenu) {
      State.activeMenu = null;
      m.redraw();
    }
  };

  return {
    oninit: (vnode) => {
      syncFilter(vnode.attrs.tab);
      Data.refreshGpgDetails().then(() => m.redraw());
      loadGxsIdentities();
      loadOwnGxsIds().then(() => preloadAllChatHistory());
      preloadAllChatHistory();
      window.addEventListener('click', dismissMenu);

      // Register for chatEvents to receive live incoming messages
      rs.events[15].notify = (chatMessage) => {
        const msgCid = chatMessage.chat_id;
        if (msgCid && msgCid.type === 2) {
          const msgPid = rs.idToHex(msgCid.distant_chat_id);

          // Find active session matching this distant chat PID
          let session = null;
          let targetGxsId = null;
          Object.keys(State.activeDistantChats || {}).forEach((id) => {
            if (State.activeDistantChats[id] && State.activeDistantChats[id].pid === msgPid) {
              session = State.activeDistantChats[id];
              targetGxsId = id;
            }
          });

          if (session) {
            const isNearDuplicate = session.messages.some(
              (m) => (m.msg || m.message) === chatMessage.msg && Math.abs(m.sendTime - chatMessage.sendTime) < 5
            );
            if (!isNearDuplicate) {
              session.messages.push(chatMessage);
              session.messages.sort((a, b) => a.sendTime - b.sendTime);
              if (targetGxsId) {
                State.chatHistoryMap[targetGxsId] = {
                  lastMsg: chatMessage.msg || chatMessage.message || '',
                  lastTime: chatMessage.sendTime || Math.floor(Date.now() / 1000),
                };
              }
              m.redraw();
              if (State.selectedId === targetGxsId) {
                setTimeout(() => {
                  const element = document.querySelector('.chat-messages');
                  if (element) element.scrollTop = element.scrollHeight;
                }, 100);
              }
            }
          } else if (State.chatPid && msgPid === State.chatPid) {
            const isNearDuplicate = State.chatMessages.some(
              (m) => (m.msg || m.message) === chatMessage.msg && Math.abs(m.sendTime - chatMessage.sendTime) < 5
            );
            if (!isNearDuplicate) {
              State.chatMessages.push(chatMessage);
              State.chatMessages.sort((a, b) => a.sendTime - b.sendTime);
              m.redraw();
              setTimeout(() => {
                const element = document.querySelector('.chat-messages');
                if (element) element.scrollTop = element.scrollHeight;
              }, 100);
            }
          }
        }
      };

      if (State.chatPid && !State.chatDisconnected) {
        startStatusPolling();
      }
    },
    onremove: () => {
      if (rs.events[15]) {
        rs.events[15].notify = () => {};
      }
      stopStatusPolling();
      window.removeEventListener('click', dismissMenu);
    },

    onupdate: (vnode) => {
      syncFilter(vnode.attrs.tab);
    },
    view: () => {
      fetchIdDetails(State.selectedId);
      const details = State.selectedId ? State.gxsIdToDetailsMap[State.selectedId] : null;
      const name = details ? details.mNickname || details.mGroupName || 'Unknown' : '';

      return m('.people-container', [
        // Left Side Panel
        m(PeopleSidebar),

        // Right Side Details / Actions Pane
        m('.people-right-pane', [
          State.selectedId && details
            ? [
                m('.network-tabs', [
                  m(
                    'button.tab-btn' + (State.activeTab === 'details' ? '.active' : ''),
                    {
                      onclick: () => {
                        State.activeTab = 'details';
                        stopStatusPolling();
                      },
                    },
                    'Profile Details'
                  ),
                  m(
                    'button.tab-btn' + (State.activeTab === 'chat' ? '.active' : ''),
                    {
                      onclick: () => {
                        State.activeTab = 'chat';
                        initializeDistantChat();
                      },
                    },
                    'Chat Conversation'
                  ),
                ]),
                m('.network-tab-content', [
                  State.activeTab === 'details' ? m(DetailsTab) : m(ChatTab),
                ]),
              ]
            : m('.network-pane-placeholder', [
                m('i.fas.fa-users'),
                m('p', 'Select an identity from the left panel to view profile details or perform actions.'),
              ]),
        ]),

        // Mail composer overlay popup
        State.showMailCompose &&
          State.selectedId &&
          m(
            '.composePopupOverlay#mailComposerPopup',
            { style: { display: 'block' } },
            m(
              '.composePopup',
              m(compose, {
                msgType: 'compose',
                toId: State.selectedId,
                friendName: name,
                isDirectMail: false,
                setShowCompose: (val) => {
                  State.showMailCompose = val;
                },
              }),
              m(
                'button.red.close-btn',
                {
                  onclick: () => {
                    State.showMailCompose = false;
                  },
                },
                m('i.fas.fa-times')
              )
            )
          ),
      ]);
    },
  };
};

PeopleLayout.setSelectedId = (id, activeTab = 'details', showCompose = false) => {
  const isOwn = State.ownGxsIds.includes(id);
  const entry = rs.userList.userMap[id];
  const isContact = entry && entry.isContact;

  let filter = 'all';
  let route = '/people/All';
  if (isOwn) {
    filter = 'own';
    route = '/people/OwnIdentity';
  } else if (isContact) {
    filter = 'contacts';
    route = '/people/MyContacts';
  }

  State.activeFilter = filter;
  State.selectedId = id;
  State.activeTab = activeTab;
  if (showCompose) {
    State.showMailCompose = true;
  }

  m.route.set(route);
};

module.exports = PeopleLayout;
 
}); 
require.register("people/people_chat_tab", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const {
  State,
  fetchIdDetails,
  getStatusColor,
  getStatusTooltip,
  initializeDistantChat,
  sendDistantChatMessage,
  stopStatusPolling,
  loadAllHistoryForSelectedPeer,
} = require('people/people_state');
const { renderChatMessage } = require('chat/chat_state');
const chatEmoji = require('chat/chat_emoji');
const peopleUtil = require('people/people_util');
const HistoryBrowserModal = require('people/people_history');

// Mirroring C++ Distant Chat packet size limit (200KB)
function formatChatImage(file, callback) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const img = new Image();
    img.onload = () => {
      // Bounding box for Distant Chat images: 800x600 max
      const maxWidth = 800;
      const maxHeight = 600;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Dynamically step down JPEG quality until base64 string is under 190,000 characters (190KB)
      let quality = 0.85;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > 190000 && quality > 0.20) {
        quality -= 0.10;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      if (dataUrl.length <= 200000) {
        callback(`<img src="${dataUrl}" />`);
      } else {
        alert('Image file is too large to send over Distant Chat 200KB packet size limit.');
        callback(null);
      }
    };
    img.onerror = () => callback(null);
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

const ChatTab = () => {
  return {
    view: () => {
      fetchIdDetails(State.selectedId);
      const details = State.selectedId ? State.gxsIdToDetailsMap[State.selectedId] : null;
      if (!details) return null;

      const name = details.mNickname || details.mGroupName || 'Unknown';

      if (State.ownGxsIds.length === 0) {
        return m('.chat-warning', [
          m('i.fas.fa-exclamation-triangle'),
          m('h4', 'No Identities Found'),
          m('p', 'You need to create a GXS identity in the "My Identities" tab before you can start distant chats.'),
        ]);
      }

      if (State.chatDisconnected) {
        return m('.chat-warning', [
          m('i.fas.fa-unlink', { style: 'font-size: 2rem; color: #ef4444; margin-bottom: 1rem;' }),
          m('h4', 'Conversation Ended'),
          m('p', 'You have closed the distant chat tunnel. Click below to reconnect.'),
          m('button.blue', {
            style: 'margin-top: 1rem; padding: 0.5rem 1.5rem; border-radius: 0.375rem; border: none; font-weight: 600; cursor: pointer;',
            onclick: () => initializeDistantChat(),
          }, 'Reconnect'),
        ]);
      }

      if (!State.chatPid) {
        return m('.chat-warning', [
          m('i.fas.fa-spinner.fa-spin'),
          m('h4', 'Connecting...'),
          m('p', 'Initiating distant chat tunnel to the peer identity...'),
        ]);
      }

      const canTalk = State.distantChatStatus && State.distantChatStatus.status === 2;

      return m('.network-chat-view', [
        m('.chat-identity-select-container', {
          style: 'padding: 0.5rem 1rem; background-color: #ffffff; border-bottom: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem;',
        }, [
          m('.chat-tunnel-status', { style: 'display: flex; align-items: center; gap: 0.5rem;' }, [
            m('span.tunnel-label', { style: 'color: #64748b; font-weight: 500;' }, 'Distant Chat Tunnel'),
            m('i.fas.fa-circle', {
              style: {
                color: getStatusColor(State.distantChatStatus ? State.distantChatStatus.status : 0),
                fontSize: '0.85rem',
                transition: 'color 0.3s ease',
              },
              title: getStatusTooltip(State.distantChatStatus ? State.distantChatStatus.status : 0),
            }),
          ]),
          m('.chat-actions', { style: 'display: flex; align-items: center; gap: 0.75rem;' }, [
            m('.select-own-profile', { style: 'display: flex; align-items: center; gap: 0.5rem;' }, [
              m('span.chatting-as-label', { style: 'color: #64748b;' }, 'Chatting as:'),
              (() => {
                const ownId = State.selectedOwnGxsIdForChat;
                if (ownId) fetchIdDetails(ownId);
                const ownDetails = State.gxsIdToDetailsMap[ownId];
                return m('.own-profile-badge', { style: 'display: flex; align-items: center; gap: 0.4rem;' }, [
                  m(peopleUtil.UserAvatar, {
                    avatar: ownDetails ? ownDetails.mAvatar : null,
                    identityId: ownId,
                    size: 24,
                  }),
                  m('select', {
                    style: 'padding: 0.25rem 0.5rem; border-radius: 0.25rem; border: 1px solid #cbd5e1; outline: none; background: #f8fafc; font-weight: 600;',
                    value: ownId,
                    onchange: (e) => {
                      State.selectedOwnGxsIdForChat = e.target.value;
                      initializeDistantChat(true);
                    },
                  }, State.ownGxsIds.map((id) => m('option', { value: id }, rs.userList.username(id)))),
                ]);
              })(),
            ]),
            m('button.blue.history-btn', {
              style: 'padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.35rem; border: none; cursor: pointer; background-color: #3b82f6; color: #ffffff; font-weight: 600;',
              title: 'View all past chat history with this contact',
              onclick: () => {
                State.showHistoryModal = true;
                State.historySearchQuery = '';
                loadAllHistoryForSelectedPeer();
              },
            }, [
              m('i.fas.fa-history', { style: 'color: #ffffff;' }),
              'History',
            ]),
            m('button.red.leave-btn', {
              style: 'padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.25rem; border: none; cursor: pointer; background-color: #ef4444; color: #ffffff;',
              onclick: () => {
                if (confirm('Are you sure you want to leave this distant chat conversation?')) {
                  rs.rsJsonApiRequest(
                    '/rsChats/closeDistantChatConnexion',
                    {
                      pid: State.chatPid,
                    },
                    (data, success) => {
                      if (success) {
                        if (State.selectedId && State.activeDistantChats[State.selectedId]) {
                          delete State.activeDistantChats[State.selectedId];
                        }
                        State.chatPid = null;
                        State.chatMessages = [];
                        State.distantChatStatus = null;
                        State.chatDisconnected = true;
                        stopStatusPolling();
                        m.redraw();
                      }
                    }
                  );
                }
              },
            }, [

              m('i.fas.fa-sign-out-alt'),
              'Leave Chat',
            ]),
          ]),
        ]),

        m('.chat-messages', [
          State.chatMessages.length === 0
            ? m('.chat-warning', [
                m('i.fas.fa-comments'),
                m('h4', 'No Messages'),
                m('p', 'Distant chats are secure and encrypted. Start the conversation by typing a message below.'),
              ])
            : State.chatMessages.map((msg) => {
                if (msg.isSystem) {
                  const text = msg.msg || msg.message;
                  const isSecured = text.includes('secured') || text.includes('talk');
                  const bgColor = isSecured ? '#fffbeb' : '#f8fafc';
                  const borderColor = isSecured ? '#fcd34d' : '#cbd5e1';
                  const textColor = isSecured ? '#b45309' : '#475569';
                  const borderStyle = isSecured ? 'solid' : 'dashed';

                  return m('.chat-bubble-container.incoming', [
                    m('.chat-sender', 'Chat status'),
                    m('.chat-bubble', {
                      style: {
                        backgroundColor: bgColor,
                        border: `1px ${borderStyle} ${borderColor}`,
                        color: textColor,
                      },
                    }, text),
                    m('.chat-time', new Date(msg.sendTime * 1000).toLocaleTimeString()),
                  ]);
                }
                const isIncoming = msg.incoming;
                const senderName = isIncoming ? name : rs.userList.username(State.selectedOwnGxsIdForChat);
                const rawText = msg.msg || msg.message || '';

                return m('.chat-bubble-container' + (isIncoming ? '.incoming' : '.outgoing'), [
                  m('.chat-sender', senderName),
                  m('.chat-bubble', renderChatMessage(rawText)),
                  m('.chat-time', new Date(msg.sendTime * 1000).toLocaleTimeString()),
                ]);
              }),
        ]),

        m('.chat-input-area', { style: 'display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: #ffffff; border-top: 1px solid #cbd5e1;' }, [
          m('button.chat-hub-action-btn', {
            disabled: !canTalk,
            style: !canTalk ? 'opacity: 0.5; cursor: not-allowed;' : '',
            title: 'Attach file link',
            onclick: () => {
              const path = prompt('Enter file path to attach as Retroshare link:');
              if (path && path.trim()) {
                const val = State.chatInputMsg || '';
                State.chatInputMsg = val ? val + '\n' + path.trim() : path.trim();
                m.redraw();
              }
            }
          }, m('i.fas.fa-paperclip')),

          m('.emoji-picker-wrapper', { style: 'position: relative;' }, [
            m('button.chat-hub-action-btn', {
              disabled: !canTalk,
              style: !canTalk ? 'opacity: 0.5; cursor: not-allowed;' : '',
              title: 'Insert emoji',
              onclick: (e) => {
                e.stopPropagation();
                State.showEmojiPicker = !State.showEmojiPicker;
              }
            }, m('i.fas.fa-smile')),
            State.showEmojiPicker && m(chatEmoji.EmojiPicker, {
              onSelect: (emoji) => {
                State.chatInputMsg = (State.chatInputMsg || '') + emoji;
                State.showEmojiPicker = false;
                m.redraw();
              }
            }),
          ]),

          m('label.chat-hub-action-btn', {
            title: 'Send image',
            style: `cursor: ${canTalk ? 'pointer' : 'not-allowed'}; opacity: ${canTalk ? 1 : 0.5};`,
          }, [
            m('i.fas.fa-image'),
            m('input[type=file][accept=image/*]', {
              style: 'display: none;',
              disabled: !canTalk,
              onchange: (e) => {
                if (!e.target.files || !e.target.files[0]) return;
                const file = e.target.files[0];
                formatChatImage(file, (imgTag) => {
                  if (imgTag) {
                    State.chatInputMsg = (State.chatInputMsg || '') + imgTag;
                    m.redraw();
                  }
                });
                e.target.value = '';
              }
            })
          ]),

          m('textarea.chat-textarea', {
            placeholder: canTalk ? 'Type a message here...' : 'Waiting for tunnel to be secured...',
            disabled: !canTalk,
            value: State.chatInputMsg,
            style: 'flex: 1; resize: none; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.5rem; font-family: inherit; font-size: 0.9rem; outline: none; min-height: 40px; max-height: 120px;',
            oninput: (e) => {
              State.chatInputMsg = e.target.value;
            },
            onpaste: (e) => {
              if (!canTalk) return;
              const items = (e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData))?.items;
              if (!items) return;
              for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                  e.preventDefault();
                  const blob = items[i].getAsFile();
                  formatChatImage(blob, (imgTag) => {
                    if (imgTag) {
                      State.chatInputMsg = (State.chatInputMsg || '') + imgTag;
                      m.redraw();
                    }
                  });
                  break;
                }
              }
            },
            onkeydown: (e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (canTalk) sendDistantChatMessage();
              }
            },
          }),

          m('button.send-btn.blue', {
            disabled: !canTalk,
            style: !canTalk ? 'opacity: 0.5; cursor: not-allowed; height: 38px;' : 'height: 38px;',
            onclick: () => {
              if (canTalk) sendDistantChatMessage();
            },
          }, [m('i.fas.fa-paper-plane'), ' Send']),
        ]),

        // Chat History Browser Modal
        m(HistoryBrowserModal),
      ]);
    },
  };
};

module.exports = ChatTab;
 
}); 
require.register("people/people_details_tab", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const widget = require('widgets');
const peopleUtil = require('people/people_util');
const ownIdsLayout = require('people/people_ownids');
const { EditIdentity, DeleteIdentity } = ownIdsLayout;
const {
  State,
  fetchIdDetails,
  getSafeAvatar,
  get64Num,
  createUsageString,
  loadGxsIdentities,
  initializeDistantChat,
} = require('people/people_state');

const DetailsTab = () => {
  return {
    view: () => {
      fetchIdDetails(State.selectedId);
      const details = State.selectedId ? State.gxsIdToDetailsMap[State.selectedId] : null;
      if (!details) return null;

      const name = details.mNickname || details.mGroupName || 'Unknown';
      const isOwn = State.ownGxsIds.includes(State.selectedId);
      const entry = rs.userList.userMap[State.selectedId];
      const isContact = entry && entry.isContact;
      const pgpId = details.mPgpId;

      return m('.network-detail-view', [
        m('.detail-header', [
          m('.avatar-container', {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              marginRight: '1rem',
            },
          }, [
            m('.friend-avatar', m(peopleUtil.UserAvatar, {
              avatar: getSafeAvatar(details),
              firstLetter: (name || '?').slice(0, 1).toUpperCase(),
              identityId: State.selectedId,
              size: 128,
              isSquare: true,
            })),
            m('.identity-votes', {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginTop: '0.5rem',
              },
            }, [
              m('.vote-positive', {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  color: '#22c55e',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                },
              }, [
                m('i.fas.fa-thumbs-up'),
                m('span', details.mReputation ? details.mReputation.mFriendsPositiveVotes : 0),
              ]),
              m('.vote-negative', {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  color: '#ef4444',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                },
              }, [
                m('i.fas.fa-thumbs-down'),
                m('span', details.mReputation ? details.mReputation.mFriendsNegativeVotes : 0),
              ]),
            ]),
          ]),
          m('.detail-title', [
            m('h2', name),
            m('.detail-subtitle', [
              m('i.fas.fa-id-card'),
              m('span', isOwn ? 'My Identity' : isContact ? 'Saved Contact' : 'Discovered Identity'),
            ]),
            m('.detail-actions', [
              isOwn
                ? [
                    m(
                      'button.btn',
                      {
                        onclick: () =>
                          widget.popupMessage(
                            m(EditIdentity, {
                              details,
                            })
                          ),
                      },
                      [m('i.fas.fa-edit'), m('span.btn-text', ' Edit')]
                    ),
                    m(
                      'button.btn.red',
                      {
                        onclick: () =>
                          widget.popupMessage(
                            m(DeleteIdentity, {
                              id: details.mId,
                              name: details.mNickname,
                            })
                          ),
                      },
                      [m('i.fas.fa-trash-alt'), m('span.btn-text', ' Delete')]
                    ),
                  ]
                : [
                    m(
                      'button.btn.blue',
                      {
                        onclick: () => {
                          State.activeTab = 'chat';
                          initializeDistantChat();
                        },
                      },
                      [m('i.fas.fa-comment-alt'), m('span.btn-text', ' Start Chat')]
                    ),
                    m(
                      'button.btn.blue',
                      {
                        onclick: () => {
                          State.showMailCompose = true;
                        },
                      },
                      [m('i.fas.fa-envelope'), m('span.btn-text', ' Send Mail')]
                    ),
                    m(
                      'button.btn' + (isContact ? '.red' : '.blue'),
                      {
                        onclick: () => {
                          rs.rsJsonApiRequest(
                            '/rsIdentity/setAsRegularContact',
                            { id: State.selectedId, isContact: !isContact },
                            () => {
                              rs.userList.loadUsers();
                              loadGxsIdentities();
                            }
                          );
                        },
                      },
                      isContact
                        ? [m('i.fas.fa-user-minus'), m('span.btn-text', ' Remove Contact')]
                        : [m('i.fas.fa-user-plus'), m('span.btn-text', ' Add Contact')]
                    ),
                  ],
            ]),
          ]),
        ]),
        m('.detail-section', [
          m('h3', 'Identity Info'),
          m('.info-grid', [
            m('.info-label', 'GXS ID'),
            m('.info-value', details.mId),
            m('.info-label', 'Type'),
            m('.info-value', details.mFlags === 14 ? 'Signed ID' : 'Anonymous ID'),
            m('.info-label', 'Owner Node GPG'),
            m('.info-value', pgpId && pgpId !== '0000000000000000' ? pgpId : 'None'),
            m('.info-label', 'Created On'),
            m(
              '.info-value',
              typeof details.mPublishTS === 'object'
                ? new Date(details.mPublishTS.xint64 * 1000).toLocaleString()
                : 'Unknown'
            ),
            m('.info-label', 'Last Used'),
            m(
              '.info-value',
              typeof details.mLastUsageTS === 'object'
                ? new Date(details.mLastUsageTS.xint64 * 1000).toLocaleDateString()
                : 'Unknown'
            ),
            m('.info-label', 'Friend votes'),
            m('.info-value', details.mReputation && (details.mReputation.mFriendsPositiveVotes > 0 || details.mReputation.mFriendsNegativeVotes > 0)
              ? `${details.mReputation.mFriendsPositiveVotes} positive, ${details.mReputation.mFriendsNegativeVotes} negative`
              : 'No votes from friends'),
            m('.info-label', 'Overall'),
            m('.info-value', (() => {
              const pos = details.mReputation ? details.mReputation.mFriendsPositiveVotes : 0;
              const neg = details.mReputation ? details.mReputation.mFriendsNegativeVotes : 0;
              if (pos > neg) return 'Positive';
              if (pos < neg) return 'Negative';
              return 'Neutral';
            })()),
          ]),
        ]),
        m('.detail-section', [
          m('h3', 'Usage Statistics'),
          m('.usage-list', [
            (!details.mUseCases || details.mUseCases.length === 0)
              ? m('p.usage-placeholder', { style: 'font-style: italic; color: #64748b; padding: 0.5rem 0;' }, '[No record in current session]')
              : (() => {
                  const sorted = [...details.mUseCases].sort((a, b) => get64Num(b.value) - get64Num(a.value));
                  return sorted.map((item) => {
                    const usage = item.key;
                    const ts = get64Num(item.value);
                    const dateStr = ts > 0 ? new Date(ts * 1000).toLocaleString() : 'Unknown';
                    return m('.usage-item', {
                      style: {
                        padding: '0.5rem 0',
                        borderBottom: '1px solid #f1f5f9',
                        fontSize: '0.9rem',
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'flex-start',
                      },
                    }, [
                      m('strong.usage-time', { style: 'color: #64748b; flex-shrink: 0; min-width: 150px;' }, dateStr),
                      m('span.usage-desc', createUsageString(usage)),
                    ]);
                  });
                })(),
          ]),
        ]),
      ]);
    },
  };
};

module.exports = DetailsTab;
 
}); 
require.register("people/people_history", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const peopleState = require('people/people_state');

const HistoryBrowserModal = () => {
  return {
    oninit: (vnode) => {
      if (vnode.attrs && vnode.attrs.state) {
        vnode.attrs.state.historySearchQuery = '';
        return;
      }
      const chatState = require('chat/chat_state');
      const isRoom = vnode.attrs && vnode.attrs.isRoom;
      if (isRoom) {
        chatState.ChatHubState.historySearchQuery = '';
        const lobbyId = chatState.ChatLobbyModel.currentLobby ? rs.idToHex(chatState.ChatLobbyModel.currentLobby.lobby_id) : null;
        if (lobbyId) {
          chatState.ChatLobbyModel.loadAllHistoryForRoom(lobbyId);
        }
      } else {
        peopleState.State.historySearchQuery = '';
        peopleState.loadAllHistoryForSelectedPeer();
      }
    },
    view: (vnode) => {
      const chatState = require('chat/chat_state');
      const isRoom = vnode.attrs && vnode.attrs.isRoom;
      const externalState = vnode.attrs && vnode.attrs.state;
      const stateObj = externalState || (isRoom ? chatState.ChatHubState : peopleState.State);

      if (!stateObj.showHistoryModal) return null;

      let name = (vnode.attrs && vnode.attrs.name) || 'Chat History';
      if (!externalState && isRoom) {
        const lobby = chatState.ChatLobbyModel.currentLobby;
        name = lobby ? lobby.lobby_name : 'Chat Room';
      } else if (!externalState) {
        const details = peopleState.State.selectedId ? peopleState.State.gxsIdToDetailsMap[peopleState.State.selectedId] : null;
        name = details ? (details.mNickname || details.mGroupName || 'Contact') : 'Contact';
      }

      const query = (stateObj.historySearchQuery || '').toLowerCase();
      const filteredHistory = (stateObj.fullHistoryMessages || []).filter((msg) => {
        if (!query) return true;
        const text = (msg.msg || msg.message || '').toLowerCase();
        return text.includes(query);
      });

      return m('.history-modal-overlay', {
        style: 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2000;',
        onclick: (e) => {
          if (e.target === e.currentTarget) stateObj.showHistoryModal = false;
        }
      }, [
        m('.history-modal', {
          style: 'background: #ffffff; border-radius: 0.5rem; width: 780px; max-width: 92%; height: 85vh; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden;'
        }, [
          // Header
          m('.history-modal-header', {
            style: 'padding: 1rem 1.25rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;'
          }, [
            m('.history-title', { style: 'display: flex; align-items: center; gap: 0.5rem;' }, [
              m('i.fas.fa-history', { style: 'color: #3b82f6; font-size: 1.2rem;' }),
              m('h3', { style: 'margin: 0; font-size: 1.1rem; font-weight: 700; color: #1e293b;' }, `Chat History Browser — ${name}`),
            ]),
            m('button.close-btn', {
              style: 'background: transparent; border: none; font-size: 1.25rem; color: #64748b; cursor: pointer; padding: 0.25rem; border-radius: 0.25rem;',
              title: 'Close history browser',
              onclick: () => (stateObj.showHistoryModal = false),
            }, m('i.fas.fa-times')),
          ]),

          // Toolbar
          m('.history-toolbar', {
            style: 'padding: 0.75rem 1.25rem; background: #ffffff; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 1rem;'
          }, [
            m('.search-input-box', { style: 'position: relative; flex: 1;' }, [
              m('i.fas.fa-search', { style: 'position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 0.85rem;' }),
              m('input[type=text][placeholder=Search past messages or keywords...]', {
                style: 'width: 100%; padding: 0.4rem 0.75rem 0.4rem 2.2rem; border-radius: 0.375rem; border: 1px solid #cbd5e1; outline: none; font-size: 0.85rem;',
                value: stateObj.historySearchQuery || '',
                oninput: (e) => (stateObj.historySearchQuery = e.target.value),
              }),
            ]),
            m('span.history-count', { style: 'font-size: 0.85rem; color: #64748b; font-weight: 600;' },
              `${filteredHistory.length} messages`
            ),
          ]),

          // Message Body
          m('.history-message-list', {
            style: 'flex: 1; overflow-y: auto; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; background: #f8fafc;'
          }, [
            stateObj.isHistoryLoading
              ? m('.loading-spinner', { style: 'text-align: center; padding: 3rem; color: #64748b;' }, [
                  m('i.fas.fa-spinner.fa-spin', { style: 'font-size: 2rem; margin-bottom: 0.75rem; color: #3b82f6;' }),
                  m('p', { style: 'font-weight: 600;' }, 'Fetching complete chat history from Retroshare database...'),
                ])
              : filteredHistory.length === 0
                ? m('.empty-history', { style: 'text-align: center; padding: 3rem; color: #64748b;' }, [
                    m('i.far.fa-comments', { style: 'font-size: 2.5rem; color: #cbd5e1; margin-bottom: 0.75rem;' }),
                    m('p', 'No past chat messages found matching your query.'),
                  ])
                : filteredHistory.map((msg) => {
                    const isIncoming = msg.incoming;
                    let senderName = msg.peerName || (isIncoming ? name : 'You');
                    if (!isIncoming && externalState) {
                      senderName = (vnode.attrs && vnode.attrs.ownName) || 'You';
                    } else if (!isIncoming) {
                      const ownId = isRoom ? (chatState.ChatLobbyModel.currentLobby ? chatState.ChatLobbyModel.currentLobby.gxs_id : '') : peopleState.State.selectedOwnGxsIdForChat;
                      senderName = rs.userList.username(ownId) || 'You';
                    }
                    const timeStr = new Date((msg.sendTime || msg.recvTime || 0) * 1000).toLocaleString();

                    return m('.history-item', {
                      style: 'background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.75rem 1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.03);'
                    }, [
                      m('.history-item-header', { style: 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;' }, [
                        m('span.sender', { style: `font-weight: 700; font-size: 0.85rem; color: ${isIncoming ? '#3b82f6' : '#10b981'};` }, senderName),
                        m('span.time', { style: 'font-size: 0.75rem; color: #94a3b8;' }, timeStr),
                      ]),
                      m('.history-item-body', { style: 'font-size: 0.9rem; color: #334155; word-break: break-word;' },
                        chatState.renderChatMessage(msg.msg || msg.message || '')
                      ),
                    ]);
                  })
          ]),
        ])
      ]);
    },
  };
};

module.exports = HistoryBrowserModal;
 
}); 
require.register("people/people_ownids", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const widget = require('widgets');
const peopleUtil = require('people/people_util');

const SignedIdentiy = () => {
  let passphase = '';

  return {
    view: (v) => [
      m('i.fas.fa-user-edit'),
      m('h3', 'Enter your passpharse'),
      m('hr'),

      m('input[type=password][placeholder=Passpharse]', {
        style: 'margin-top:50px;width:80%',
        oninput: (e) => {
          passphase = e.target.value;
        },
      }),
      m(
        'button',
        {
          style: 'margin-top:160px;',
          onclick: () => {
            rs.rsJsonApiRequest('/rsIdentity/getOwnSignedIds', {}, (owns) => {

              owns.ids.length > 0
                ? rs.rsJsonApiRequest(
                  '/rsIdentity/createIdentity',
                  {
                    id: owns.ids[0],
                    name: v.attrs.name,
                    avatar: { mData: { base64: v.attrs.avatar } },
                    pseudonimous: false,
                    pgpPassword: passphase,
                  },
                  (data) => {
                    const message = data.retval
                      ? 'Successfully created identity.'
                      : 'An error occured while creating identity.';
                    widget.popupMessage([m('h3', 'Create new Identity'), m('hr'), message]);
                  }
                )
                : widget.popupMessage([
                  m('h3', 'Create new Identity'),
                  m('hr'),
                  'An error occured while creating identity.',
                ]);
            });
          },
        },
        'Enter'
      ),
    ],
  };
};
const CreateIdentity = () => {
  let name = '',
    pseudonimous = false;
  let avatar;
  let avatarPreview = '';
  let avatarFileName = '';
  return {
    view: () => m('.create-identity-form', [
      m('.create-identity-form__heading', [
        m('i.fas.fa-user-plus'),
        m('div', [
          m('h3', 'Create new Identity'),
          m('p', 'Choose a name, identity type, and optional custom avatar.'),
        ]),
      ]),
      m('input.create-identity-form__name[type=text][placeholder=Identity name]', {
        value: name,
        oninput: (e) => (name = e.target.value),
      }),
      m('.create-identity-form__avatar', [
        m('.create-identity-avatar-preview', [
          avatarPreview
            ? m('img', { src: avatarPreview, alt: 'Identity avatar preview' })
            : m(peopleUtil.UserAvatar, {
              identityId: `new-identity:${name || 'identity'}`,
              firstLetter: (name || '?').slice(0, 1).toUpperCase(),
              size: 128,
              isSquare: true,
            }),
        ]),
        m('span.create-identity-form__avatar-label', 'Avatar'),
        m('input.create-identity-form__file-input[type=file][id=create-identity-avatar][accept=image/*]', {
          onchange: (e) => {
            const file = e.target.files[0];
            if (!file) return;
            avatarFileName = file.name;
            const reader = new FileReader();
            reader.onloadend = () => {
              avatarPreview = reader.result;
              avatar = avatarPreview.substring(avatarPreview.indexOf(',') + 1);
              m.redraw();
            };
            reader.readAsDataURL(file);
          },
        }),
        m('label.create-identity-form__file-button[for=create-identity-avatar]', {
          title: avatarFileName || 'Choose a custom avatar',
        }, [m('i.fas.fa-upload'), avatarPreview ? ' Change avatar' : ' Choose avatar']),
        avatarPreview && m('button.create-identity-form__remove-avatar[type=button]', {
          onclick: () => {
            avatar = undefined;
            avatarPreview = '';
            avatarFileName = '';
          },
        }, 'Use default'),
        m('small', avatarPreview ? 'Custom avatar selected.' : 'A unique default avatar is generated automatically.'),
      ]),
      m('.create-identity-form__field', [
        m('label[for=create-identity-type]', 'Identity type'),
        m('select.config-style-select[id=create-identity-type]', {
          value: String(pseudonimous),
          onchange: (e) => (pseudonimous = e.target.value === 'true'),
        }, [
          m('option[value=false]', 'Linked to your Profile'),
          m('option[value=true]', 'Pseudonymous'),
        ]),
      ]),
      m('p.create-identity-form__help',
        'You can have one or more identities. ' +
        'They are used when you chat in lobbies, ' +
        'forums and channel comments. ' +
        'They act as the destination for distant chat and ' +
        'the Retroshare distant mail system.'
      ),
      m('button.create-identity-form__submit',
        {
          disabled: !name.trim(),
          onclick: () => {
            !pseudonimous
              ? widget.popupMessage(m(SignedIdentiy, { name: name.trim(), avatar }))
              : rs.rsJsonApiRequest(
                '/rsIdentity/createIdentity',
                {
                  name: name.trim(),
                  avatar: { mData: { base64: avatar } },
                  pseudonimous,
                },
                (data) => {
                  const message = data.retval
                    ? 'Successfully created identity.'
                    : 'An error occured while creating identity.';
                  widget.popupMessage([m('h3', 'Create new Identity'), m('hr'), message]);
                }
              );
          },
        },
        'Create'
      ),
    ]),
  };
};

const SignedEditIdentity = () => {
  let passphase = '';
  return {
    view: (v) => [
      m('i.fas.fa-user-edit'),
      m('h3', 'Enter your passpharse'),
      m('hr'),

      m('input[type=password][placeholder=Passpharse]', {
        style: 'margin-top:50px;width:80%',
        oninput: (e) => {
          passphase = e.target.value;
        },
      }),
      m(
        'button',
        {
          style: 'margin-top:160px;',
          onclick: () =>
            rs.rsJsonApiRequest(
              '/rsIdentity/updateIdentity',
              {
                id: v.attrs.details.mId,
                name: v.attrs.name,
                pseudonimous: false,
                pgpPassword: passphase,
              },
              (data) => {
                const message = data.retval
                  ? 'Successfully created identity.'
                  : 'An error occured while creating identity.';
                widget.popupMessage([m('h3', 'Create new Identity'), m('hr'), message]);
              }
            ),
        },
        'Enter'
      ),
    ],
  };
};

const EditIdentity = () => {
  let name = '';
  return {
    view: (v) => [
      m('i.fas.fa-user-edit'),
      m('h3', 'Edit Identity'),
      m('hr'),
      m('input[type=text][placeholder=Name]', {
        value: name,
        oninput: (e) => {
          name = e.target.value;
        },
      }),
      m('canvas'),
      m(
        'button',
        {
          onclick: () => {
            !peopleUtil.checksudo(v.attrs.details.mPgpId)
              ? widget.popupMessage([
                m(SignedEditIdentity, {
                  name,
                  details: v.attrs.details,
                }),
              ])
              : rs.rsJsonApiRequest(
                '/rsIdentity/updateIdentity',
                {
                  id: v.attrs.details.mId,

                  name,

                  // avatar: v.attrs.details.mAvatar.mData.base64,
                  pseudonimous: true,
                },
                (data) => {
                  const message = data.retval
                    ? 'Successfully Updated identity.'
                    : 'An error occured while updating  identity.';
                  widget.popupMessage([m('h3', 'Update Identity'), m('hr'), message]);
                }
              );
          },
        },
        'Save'
      ),
    ],
  };
};

const DeleteIdentity = () => {
  return {
    view: (v) => [
      m('i.fas.fa-user-times'),
      m('h3', 'Delete Identity: ' + v.attrs.name),
      m('hr'),
      m('p', 'Are you sure you want to delete this Identity? It cannot be restore'),
      m(
        'button',
        {
          onclick: () =>
            rs.rsJsonApiRequest(
              '/rsIdentity/deleteIdentity',
              {
                id: v.attrs.id,
              },
              () => {
                widget.popupMessage([
                  m('i.fas.fa-user-edit'),
                  m('h3', 'Delete Identity: ' + v.attrs.name),
                  m('hr'),
                  m('p', 'Identity Deleted successfuly.'),
                ]);
              }
            ),
        },
        'Confirm'
      ),
    ],
  };
};

const Identity = () => {
  let details = {};

  return {
    oninit: (v) =>
      rs.rsJsonApiRequest(
        '/rsIdentity/getIdDetails',
        {
          id: v.attrs.id,
        },
        (data) => {
          details = data.details;
        }
      ),
    view: (v) =>
      m(
        '.identity',
        {
          key: details.mId,
        },
        [
          m('h4', details.mNickname),
          details.mNickname &&
          m(peopleUtil.UserAvatar, {
            avatar: details.mAvatar,
            firstLetter: details.mNickname.slice(0, 1).toUpperCase(),
            identityId: details.mId,
          }),
          m('.details', [
            m('p', 'ID:'),
            m('p', details.mId),
            m('p', 'Type:'),
            m('p', details.mFlags === 14 ? 'Signed ID' : 'Anonymous ID'),
            m('p', 'Owner node ID:'),
            m('p', details.mPgpId),
            m('p', 'Created on:'),
            m(
              'p',
              typeof details.mPublishTS === 'object'
                ? new Date(details.mPublishTS.xint64 * 1000).toLocaleString()
                : 'undefiend'
            ),
            m('p', 'Last used:'),
            m(
              'p',
              typeof details.mLastUsageTS === 'object'
                ? new Date(details.mLastUsageTS.xint64 * 1000).toLocaleDateString()
                : 'undefiend'
            ),
          ]),
          m(
            'button',
            {
              onclick: () =>
                m.route.set('/chat/:userid/createdistantchat', {
                  userid: details.mId,
                }),
            },
            'Chat'
          ),
          m(
            'button',
            {
              onclick: () =>
                widget.popupMessage(
                  m(EditIdentity, {
                    details,
                  })
                ),
            },
            'Edit'
          ),
          m(
            'button.red',
            {
              onclick: () =>
                widget.popupMessage(
                  m(DeleteIdentity, {
                    id: details.mId,
                    name: details.mNickname,
                  })
                ),
            },
            'Delete'
          ),
        ]
      ),
  };
};

const Layout = () => {
  let ownIds = [];
  return {
    oninit: () => peopleUtil.ownIds((data) => (ownIds = data)),
    view: () =>
      m('.widget', [
        m('.widget__heading', [
          m('h3', 'Own Identities', m('span.counter', ownIds.length)),
          m(
            'button',
            {
              onclick: () => widget.popupMessage(m(CreateIdentity), 'create-identity-modal'),
            },
            'New Identity'
          ),
        ]),
        m('.widget__body', [ownIds.map((id) => m(Identity, { id }))]),
      ]),
  };
};

Layout.CreateIdentity = CreateIdentity;
Layout.EditIdentity = EditIdentity;
Layout.DeleteIdentity = DeleteIdentity;

module.exports = Layout;
 
}); 
require.register("people/people_own_contacts", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const peopleUtil = require('people/people_util');

const MyContacts = () => {
  const list = peopleUtil.contactlist(rs.userList.users);
  return {
    view: () => {
      return m('.widget', [
        m('.widget__heading', [
          m('h3', 'MyContacts', m('span.counter', list.length)),
          m(peopleUtil.SearchBar),
        ]),
        m('.widget__body', [list.map((id) => m(peopleUtil.regularcontactInfo, { id }))]),
      ]);
    },
  };
};

module.exports = {
  view: () => {
    return m(MyContacts);
  },
};
 
}); 
require.register("people/people_resolver", function(exports, require, module) { 
const m = require('mithril');
const PeopleLayout = require('people/people');

module.exports = {
  view: (vnode) => {
    const tab = vnode.attrs.tab || 'All';
    return m(PeopleLayout, { tab });
  },
};
 
}); 
require.register("people/people_sidebar", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const widget = require('widgets');
const peopleUtil = require('people/people_util');
const ownIdsLayout = require('people/people_ownids');
const { CreateIdentity } = ownIdsLayout;
const {
  State,
  isSystemMsg,
  preloadAllChatHistory,
  fetchIdDetails,
  loadGxsIdentities,
  getSafeAvatar,
  get64Num,
  stopStatusPolling,
  initializeDistantChat,
} = require('people/people_state');

function formatRelativeTime(ts) {
  if (!ts) return '';
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ts;
  if (diff < 30) return 'Just Now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min${Math.floor(diff / 60) > 1 ? 's' : ''}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr${Math.floor(diff / 3600) > 1 ? 's' : ''}`;
  return `${Math.floor(diff / 86400)} d`;
}

const PeopleSidebar = () => {
  return {
    oninit: () => {
      preloadAllChatHistory();
    },
    view: () => {
      // 1. Determine list based on mainTab ('people' vs 'chats')
      let displayItems;

      // 0. Compute active chats count (conversations with real message history)
      const allUserGroupIds = new Set((rs.userList.users || []).map((u) => u.mGroupId));
      Object.keys(State.chatHistoryMap || {}).forEach((id) => allUserGroupIds.add(id));
      let activeChatsCount = 0;
      allUserGroupIds.forEach((gxsId) => {
        const hist = State.chatHistoryMap && State.chatHistoryMap[gxsId];
        if (hist && hist.lastMsg && !isSystemMsg(hist.lastMsg)) {
          activeChatsCount++;
        }
      });

      if (State.mainTab === 'people') {
        let baseList;
        if (State.activeFilter === 'own') {
          baseList = peopleUtil.sortIds(State.ownGxsIds) || [];
        } else if (State.activeFilter === 'contacts') {
          baseList = peopleUtil.contactlist(rs.userList.users) || [];
        } else {
          baseList = peopleUtil.sortUsers(rs.userList.users) || [];
        }

        displayItems = baseList.filter((item) => {
          const name = State.activeFilter === 'own' ? (rs.userList.username(item) || 'Unknown') : (item.mGroupName || 'Unknown');
          return name.toLowerCase().includes(State.searchString.toLowerCase());
        });

        displayItems.sort((a, b) => {
          const nameA = State.activeFilter === 'own' ? (rs.userList.username(a) || '') : (a.mGroupName || '');
          const nameB = State.activeFilter === 'own' ? (rs.userList.username(b) || '') : (b.mGroupName || '');
          return nameA.localeCompare(nameB);
        });
      } else {
        // Chats Tab: ONLY contacts and identities that have real chat history (ignoring system tunnel status logs)
        displayItems = Array.from(allUserGroupIds)
          .map((gxsId) => {
            const entry = rs.userList.userMap[gxsId];
            const name = entry && entry.name ? entry.name : (rs.userList.username(gxsId) || 'Unknown');
            return { mGroupId: gxsId, mGroupName: name };
          })
          .filter((item) => {
            const gxsId = item.mGroupId;
            fetchIdDetails(gxsId);
            const hist = State.chatHistoryMap && State.chatHistoryMap[gxsId];

            const hasRealHistory = Boolean(hist && hist.lastMsg && !isSystemMsg(hist.lastMsg));

            if (!hasRealHistory) return false;

            const name = item.mGroupName || 'Unknown';
            return name.toLowerCase().includes(State.searchString.toLowerCase());
          });

        // Sort by chat timestamp descending
        displayItems.sort((a, b) => {
          const histA = State.chatHistoryMap[a.mGroupId];
          const histB = State.chatHistoryMap[b.mGroupId];
          const detailsA = State.gxsIdToDetailsMap[a.mGroupId];
          const detailsB = State.gxsIdToDetailsMap[b.mGroupId];

          const timeA = histA ? histA.lastTime : (detailsA ? get64Num(detailsA.mLastUsageTS) : 0);
          const timeB = histB ? histB.lastTime : (detailsB ? get64Num(detailsB.mLastUsageTS) : 0);
          return timeB - timeA;
        });
      }

      return m('.people-left-pane', [
        // Sidebar Header Container
        m('.people-sidebar-header', [
          // 1. Top Search Bar
          m('.searchbar-wrapper', [
            m('i.fas.fa-search'),
            m('input.searchbar-input[type=text][placeholder=Search...]', {
              value: State.searchString,
              oninput: (e) => {
                State.searchString = e.target.value;
              },
            }),
          ]),

          // 2. Dual Segmented Tab Control: [People] | [Chats]
          m('.segmented-control', [
            m(
              'button.segment-tab' + (State.mainTab === 'people' ? '.active' : ''),
              {
                onclick: () => {
                  State.mainTab = 'people';
                  m.redraw();
                },
              },
              [m('i.fas.fa-users'), ' People']
            ),
            m(
              'button.segment-tab' + (State.mainTab === 'chats' ? '.active' : ''),
              {
                onclick: () => {
                  State.mainTab = 'chats';
                  preloadAllChatHistory();
                  m.redraw();
                },
              },
              [
                m('i.fas.fa-comments'),
                ' Chats',
                activeChatsCount > 0 && m('span.segment-badge', activeChatsCount),
              ]
            ),
          ]),


          // 3. Sub-Filter Row (People Tab)
          State.mainTab === 'people' &&
            m('.sub-filter-row', [
              m(
                'select.filter-select',
                {
                  value: State.activeFilter,
                  onchange: (e) => {
                    State.activeFilter = e.target.value;
                    m.route.set(
                      '/people/' +
                        (State.activeFilter === 'contacts'
                          ? 'MyContacts'
                          : State.activeFilter === 'own'
                          ? 'OwnIdentity'
                          : 'All')
                    );
                  },
                },
                [
                  m('option[value=contacts]', 'Contacts'),
                  m('option[value=own]', 'My Identities'),
                  m('option[value=all]', 'All Users'),
                ]
              ),
              State.activeFilter === 'own' &&
                m(
                  'button.btn-add-id[title=Create New Identity]',
                  {
                    onclick: () => widget.popupMessage(m(CreateIdentity), 'create-identity-modal'),
                  },
                  m('i.fas.fa-plus')
                ),
            ]),
        ]),

        // Scrollable List Container
        m('.friends-list-container', [
          m('.friends-scroll', [
            displayItems.length === 0
              ? m('.network-pane-placeholder', { style: 'padding: 2rem 0;' }, State.mainTab === 'chats' ? 'No active chats' : 'No identities found')
              : displayItems.map((item) => {
                  let gxsId, displayName;
                  if (State.mainTab === 'people' && State.activeFilter === 'own') {
                    gxsId = item;
                    displayName = rs.userList.username(gxsId) || 'Unknown';
                  } else {
                    gxsId = item.mGroupId;
                    displayName = item.mGroupName || 'Unknown';
                  }

                  fetchIdDetails(gxsId);
                  const itemDetails = State.gxsIdToDetailsMap[gxsId];
                  const itemAvatar = getSafeAvatar(itemDetails);
                  const itemFirstLetter = (displayName || '?').slice(0, 1).toUpperCase();
                  const isSelected = State.selectedId === gxsId;

                  const itemEntry = rs.userList.userMap[gxsId];
                  const itemIsContact = itemEntry && itemEntry.isContact;
                  const itemIsOwn = State.ownGxsIds.includes(gxsId);

                  const hist = State.chatHistoryMap[gxsId];
                  const lastTS = hist ? hist.lastTime : (itemDetails ? get64Num(itemDetails.mLastUsageTS) : 0);
                  const relativeTimeStr = formatRelativeTime(lastTS);
                  const lastMsgText = hist && hist.lastMsg ? hist.lastMsg : (itemIsOwn ? 'My Identity' : itemIsContact ? 'Saved Contact' : 'Distant Chat');

                  if (State.mainTab === 'chats') {
                    return m(
                      '.chat-item',
                      {
                        class: isSelected ? 'selected' : '',
                        onclick: (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          State.activeMenu = null;
                          State.selectedId = gxsId;
                          State.activeTab = 'chat';
                          initializeDistantChat();
                          m.redraw();
                        },
                        oncontextmenu: (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          State.selectedId = gxsId;
                          const container = document.querySelector('.friends-list-container');
                          if (container) {
                            const parentRect = container.getBoundingClientRect();
                            const top = e.clientY - parentRect.top;
                            const left = Math.min(Math.max(e.clientX - parentRect.left, 10), 160);
                            State.activeMenu = { gxsId, displayName, isContact: itemIsContact, top, left };
                          }
                          m.redraw();
                        },
                      },
                      [
                        m('.chat-avatar-wrapper', [
                          m(peopleUtil.UserAvatar, {
                            avatar: itemAvatar,
                            firstLetter: itemFirstLetter,
                            identityId: gxsId,
                            size: 40,
                          }),
                          m('.status-dot', {
                            style: {
                              backgroundColor: itemIsContact || itemIsOwn ? '#22c55e' : '#cbd5e1',
                            },
                          }),
                        ]),
                        m('.chat-info', [
                          m('.chat-name', displayName),
                          m('.chat-last-msg', lastMsgText),
                        ]),
                        m('.chat-meta', [
                          relativeTimeStr && m('.chat-time', relativeTimeStr),
                        ]),
                      ]
                    );
                  }

                  // People tab list item
                  return m(
                    '.friend-list-item',
                    {
                      class: isSelected ? 'selected' : '',
                      onclick: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        State.activeMenu = null;

                        const idChanged = State.selectedId !== gxsId;
                        State.selectedId = gxsId;
                        if (idChanged) {
                          State.chatPid = null;
                          State.chatMessages = [];
                          stopStatusPolling();
                          if (State.activeTab === 'chat') {
                            initializeDistantChat();
                          }
                        }
                        m.redraw();
                      },
                      oncontextmenu: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        State.selectedId = gxsId;

                        const container = document.querySelector('.friends-list-container');
                        if (container) {
                          const parentRect = container.getBoundingClientRect();
                          const top = e.clientY - parentRect.top;
                          const left = Math.min(Math.max(e.clientX - parentRect.left, 10), 160);
                          State.activeMenu = { gxsId, displayName, isContact: itemIsContact, top, left };
                        }
                        m.redraw();
                      },
                    },
                    [
                      m('.friend-avatar', m(peopleUtil.UserAvatar, {
                        avatar: itemAvatar,
                        firstLetter: itemFirstLetter,
                        identityId: gxsId,
                      })),
                      m('.friend-meta', [
                        m('.friend-name', displayName),
                        m(
                          '.friend-status',
                          itemIsOwn
                            ? 'My Identity'
                            : itemIsContact
                            ? 'Contact'
                            : 'Identity'
                        ),
                      ]),
                    ]
                  );
                }),
          ]),

          // Context Menu
          State.activeMenu && (() => {
            const menu = State.activeMenu;
            const isOwn = State.ownGxsIds.includes(menu.gxsId);

            return [
              m('.menu-backdrop', {
                style: {
                  position: 'fixed',
                  inset: 0,
                  zIndex: 9998,
                },
                onclick: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  State.activeMenu = null;
                  m.redraw();
                },
                oncontextmenu: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  State.activeMenu = null;
                  m.redraw();
                },
              }),
              m('.people-context-menu', {
                style: {
                  top: `${menu.top}px`,
                  left: menu.left !== undefined ? `${menu.left}px` : '10px',
                  position: 'absolute',
                  zIndex: 9999,
                },
                onclick: (e) => {
                  e.stopPropagation();
                },
              }, [
                !isOwn && m('.menu-item', {
                  onclick: () => {
                    State.activeMenu = null;
                    State.selectedId = menu.gxsId;
                    State.activeTab = 'chat';
                    State.chatPid = null;
                    State.chatMessages = [];
                    initializeDistantChat();
                    m.redraw();
                  },
                }, [
                  m('i.fas.fa-comments', { style: 'color: #3b82f6; margin-right: 0.5rem;' }),
                  'Start chat',
                ]),
                !isOwn && m('.menu-item', {
                  onclick: () => {
                    State.activeMenu = null;
                    State.selectedId = menu.gxsId;
                    State.activeTab = 'details';
                    State.showMailCompose = true;
                    m.redraw();
                  },
                }, [
                  m('i.fas.fa-envelope', { style: 'color: #10b981; margin-right: 0.5rem;' }),
                  'Send mail',
                ]),
                !isOwn && m('.menu-item', {
                  onclick: () => {
                    State.activeMenu = null;
                    rs.rsJsonApiRequest(
                      '/rsIdentity/setAsRegularContact',
                      { id: menu.gxsId, isContact: !menu.isContact },
                      (data, success) => {
                        if (success) {
                          loadGxsIdentities();
                        }
                      }
                    );
                  },
                }, [
                  m('i.fas' + (menu.isContact ? '.fa-user-minus' : '.fa-user-plus'), {
                    style: {
                      color: menu.isContact ? '#ef4444' : '#3b82f6',
                      marginRight: '0.5rem',
                    },
                  }),
                  menu.isContact ? 'Remove from Contacts' : 'Add to Contacts',
                ]),
              ]),
            ];
          })(),
        ]),
      ]);
    },
  };
};

module.exports = PeopleSidebar;
 
}); 
require.register("people/people_state", function(exports, require, module) { 
const m = require('mithril');
const rs = require('rswebui');
const Data = require('network/network_data');
const peopleUtil = require('people/people_util');

const State = {
  searchString: '',
  selectedId: null, // GXS ID of the selected identity
  mainTab: 'people', // 'people' | 'chats'
  activeFilter: 'contacts', // 'all' | 'contacts' | 'own'
  gxsIdToDetailsMap: {},
  ownGxsIds: [],
  gpgToGxsIdMap: {},
  chatHistoryMap: {}, // gxsId -> { lastMsg, lastTime }
  showMailCompose: false,
  activeTab: 'details',
  selectedOwnGxsIdForChat: '',
  chatPid: null,
  chatMessages: [],
  chatInputMsg: '',
  distantChatStatus: null,
  statusPollInterval: null,
  chatDisconnected: false,
  activeDistantChats: {}, // gxsId -> { pid, status, messages, inputMsg, disconnected }
  activeMenu: null,
  showHistoryModal: false,
  historySearchQuery: '',
  fullHistoryMessages: [],
  isHistoryLoading: false,
};

function getDistantChatSession(gxsId) {
  if (!gxsId) return null;
  if (!State.activeDistantChats[gxsId]) {
    State.activeDistantChats[gxsId] = {
      pid: null,
      status: null,
      messages: [],
      inputMsg: '',
      disconnected: false,
    };
  }
  return State.activeDistantChats[gxsId];
}


function fetchIdDetails(gxsId) {
  if (!gxsId) return;
  if (State.gxsIdToDetailsMap[gxsId] === undefined) {
    State.gxsIdToDetailsMap[gxsId] = null; // Mark as loading
    rs.rsJsonApiRequest('/rsIdentity/getIdDetails', { id: gxsId }, (detData) => {
      if (detData && detData.details) {
        State.gxsIdToDetailsMap[gxsId] = detData.details;
        const pgpId = detData.details.mPgpId;
        if (pgpId && pgpId !== '0000000000000000') {
          State.gpgToGxsIdMap[pgpId.toLowerCase()] = gxsId;
        }
        m.redraw();
      }
    });
  }
}

function loadGxsIdentities() {
  rs.rsJsonApiRequest('/rsIdentity/getIdentitiesSummaries', {}, (data) => {
    if (data && data.ids) {
      m.redraw();
    }
  });
}

function loadOwnGxsIds() {
  return new Promise((resolve) => {
    peopleUtil.ownIds((ids) => {
      State.ownGxsIds = ids || [];
      if (State.ownGxsIds.length > 0 && !State.selectedOwnGxsIdForChat) {
        State.selectedOwnGxsIdForChat = State.ownGxsIds[0];
      }
      m.redraw();
      resolve();
    });
  });
}

function get64Num(val) {
  if (!val) return 0;
  if (typeof val === 'object') {
    return val.xint64 || parseInt(val.xstr64) || 0;
  }
  return Number(val) || 0;
}

function getServiceName(serviceId) {
  switch (serviceId) {
    case 1: return 'Channels';
    case 2: return 'Forums';
    case 3: return 'Boards';
    case 4: return 'Chat';
    case 5: return 'GxsCircles';
    case 6: return 'GxsMail';
    case 7: return 'GxsCircles';
    case 8: return 'Wire';
    default: return 'Unknown (' + serviceId + ')';
  }
}

function createUsageString(u) {
  if (!u) return '[Unknown]';
  const serviceName = getServiceName(u.mServiceId);
  const usageCode = u.mUsageCode;

  switch (usageCode) {
    case 0:
      return '[Unknown]';
    case 1:
      return `Admin signature in service ${serviceName}`;
    case 2:
      return `Admin signature verification in service ${serviceName}`;
    case 3:
      return `Creation of author signature in service ${serviceName}`;
    case 4:
    case 7:
      return `Group author for group ${u.mGrpId || 'Unknown'} in service ${serviceName}`;
    case 5:
      return `Message signature creation in group ${u.mGrpId || 'Unknown'} of service ${serviceName}`;
    case 6:
    case 8:
      return `Vote/comment in ${serviceName} service (Group: ${u.mGrpId || 'Unknown'}, Msg: ${u.mMsgId || 'Unknown'})`;
    case 9:
      return `Message in chat room (Id: ${get64Num(u.mAdditionalId)})`;
    case 10:
      return 'Distant message signature validation.';
    case 11:
      return 'Distant message signature creation.';
    case 12:
      return 'Signature validation in distant tunnel system.';
    case 13:
      return 'Signature in distant tunnel system.';
    case 14:
      return 'Received from GXS sync.';
    case 15:
      return 'Received from GXS discovery.';
    case 16:
      return 'Explicit request to friend.';
    case 17:
      return 'Generic signature validation.';
    case 18:
      return 'Generic signature creation.';
    case 19:
      return 'Generic encryption.';
    case 20:
      return 'Generic decryption.';
    case 21:
      return 'Circle membership check.';
    default:
      return `Usage code ${usageCode} in service ${serviceName}`;
  }
}

function getSafeAvatar(details) {
  return details && details.mAvatar ? details.mAvatar : undefined;
}

function getOnlineSslId(gpgId) {
  if (!gpgId) return null;
  const friend = Data.gpgDetails[gpgId.toLowerCase()];
  if (friend && friend.locations) {
    const onlineLoc = friend.locations.find((loc) => loc.isOnline);
    return onlineLoc ? onlineLoc.id : null;
  }
  return null;
}

function isIdentityOnline(gxsId) {
  fetchIdDetails(gxsId);
  const details = State.gxsIdToDetailsMap[gxsId];
  if (details && details.mPgpId && details.mPgpId !== '0000000000000000') {
    const friend = Data.gpgDetails[details.mPgpId.toLowerCase()];
    return friend ? friend.isOnline : false;
  }
  return false;
}

function syncFilter(tab) {
  let newFilter = 'all';
  if (tab === 'OwnIdentity') {
    newFilter = 'own';
  } else if (tab === 'MyContacts') {
    newFilter = 'contacts';
  }

  if (State.activeFilter !== newFilter) {
    State.activeFilter = newFilter;
  }
}

function getStatusColor(status) {
  switch (status) {
    case 1: return '#eab308'; // Yellow
    case 2: return '#22c55e'; // Green
    case 3: return '#ef4444'; // Red
    default: return '#94a3b8'; // Grey
  }
}

function getStatusTooltip(status) {
  switch (status) {
    case 1: return 'Tunnel is pending. Please wait...';
    case 2: return 'End-to-end encrypted conversation established. You can talk!';
    case 3: return 'Your partner closed the conversation.';
    default: return 'Remote status unknown.';
  }
}

function pollDistantChatStatus() {
  if (!State.chatPid) return;
  const session = State.selectedId ? getDistantChatSession(State.selectedId) : null;

  rs.rsJsonApiRequest(
    '/rsChats/getDistantChatStatus',
    {
      pid: State.chatPid,
    },
    (detail, success) => {
      if (success && detail.retval) {
        State.distantChatStatus = detail.info;
        if (session) session.status = detail.info;

        if (detail.info.status === 2) {
          const text = 'Tunnel is secured. You can talk!';
          const exists = State.chatMessages.some(
            (m) => m.isSystem && (m.msg === text || m.message === text)
          );
          if (!exists) {
            State.chatMessages.push({
              incoming: true,
              isSystem: true,
              msg: text,
              sendTime: Math.floor(Date.now() / 1000),
            });
            State.chatMessages.sort((a, b) => a.sendTime - b.sendTime);
          }
        } else if (detail.info.status === 3) {
          const text = 'Your partner closed the conversation.';
          const exists = State.chatMessages.some(
            (m) => m.isSystem && (m.msg === text || m.message === text)
          );
          if (!exists) {
            State.chatMessages.push({
              incoming: true,
              isSystem: true,
              msg: text,
              sendTime: Math.floor(Date.now() / 1000),
            });
            State.chatMessages.sort((a, b) => a.sendTime - b.sendTime);
          }
        }
        m.redraw();
      }
    }
  );
}

function startStatusPolling() {
  stopStatusPolling();
  pollDistantChatStatus();
  State.statusPollInterval = setInterval(pollDistantChatStatus, 3000);
}

function stopStatusPolling() {
  if (State.statusPollInterval) {
    clearInterval(State.statusPollInterval);
    State.statusPollInterval = null;
  }
}

function isSystemMsg(msgText) {
  if (!msgText || typeof msgText !== 'string') return true;
  const lower = msgText.toLowerCase();
  return (
    lower.includes('starting distant chat') ||
    lower.includes('please wait for secure tunnel') ||
    lower.includes('tunnel is secured') ||
    lower.includes('chat initiated') ||
    lower.includes('closed the conversation')
  );
}

function initializeDistantChat(force = false) {
  if (!State.selectedId || !State.selectedOwnGxsIdForChat) return;

  const session = getDistantChatSession(State.selectedId);

  // If chat session is already established/initiating for this peer and not forced/disconnected:
  if (!force && session.pid && !session.disconnected) {
    State.chatPid = session.pid;
    State.chatMessages = session.messages;
    State.distantChatStatus = session.status;
    State.chatDisconnected = session.disconnected;

    loadChatMessages();
    pollDistantChatStatus();
    startStatusPolling();
    return;
  }

  // Otherwise, start a new tunnel for this peer
  session.pid = null;
  session.status = null;
  session.messages = [
    {
      incoming: true,
      isSystem: true,
      msg: 'Starting distant chat... Please wait for secure tunnel.',
      sendTime: Math.floor(Date.now() / 1000),
    }
  ];
  session.disconnected = false;

  State.chatPid = null;
  State.chatMessages = session.messages;
  State.distantChatStatus = null;
  State.chatDisconnected = false;
  m.redraw();

  rs.rsJsonApiRequest(
    '/rsChats/initiateDistantChatConnexion',
    {
      to_pid: State.selectedId,
      from_pid: State.selectedOwnGxsIdForChat,
      notify: true,
    },
    (res) => {
      if (res && res.pid) {
        const hexPid = rs.idToHex(res.pid);
        session.pid = hexPid;
        State.chatPid = hexPid;
        State.distantChatStatus = null;
        loadChatMessages();
        pollDistantChatStatus();
        startStatusPolling();
      }
    }
  );
}


function loadChatMessages() {
  if (!State.chatPid) return;

  const chatPeerId = {
    broadcast_status_peer_id: '00000000000000000000000000000000',
    type: 2, // TYPE_PRIVATE_DISTANT
    peer_id: '00000000000000000000000000000000',
    distant_chat_id: State.chatPid,
    lobby_id: { xstr64: '0' },
  };

  rs.rsJsonApiRequest(
    '/rsHistory/getMessages',
    {
      chatPeerId,
      loadCount: 50,
    },
    (data, success) => {
      if (success && data.msgs) {
        State.chatMessages = data.msgs;
        const realUserMsgs = data.msgs.filter(
          (m) => !m.isSystem && !isSystemMsg(m.message || m.msg)
        );
        if (realUserMsgs.length > 0 && State.selectedId) {
          const last = realUserMsgs[realUserMsgs.length - 1];
          State.chatHistoryMap[State.selectedId] = {
            lastMsg: last.message || last.msg || '',
            lastTime: last.sendTime || last.recvTime || Math.floor(Date.now() / 1000),
          };
        } else if (State.selectedId) {
          delete State.chatHistoryMap[State.selectedId];
        }
        m.redraw();
        setTimeout(() => {
          const element = document.querySelector('.chat-messages');
          if (element) element.scrollTop = element.scrollHeight;
        }, 100);
      }
    }
  );
}

function sendDistantChatMessage() {
  if (!State.chatInputMsg.trim() || !State.chatPid) return;

  const cid = {
    broadcast_status_peer_id: '00000000000000000000000000000000',
    type: 2, // TYPE_PRIVATE_DISTANT
    peer_id: '00000000000000000000000000000000',
    distant_chat_id: State.chatPid,
    lobby_id: { xstr64: '0' },
  };

  const text = State.chatInputMsg;
  State.chatInputMsg = '';

  rs.rsJsonApiRequest(
    '/rsChats/sendChat',
    {
      id: cid,
      msg: text,
    },
    (data, success) => {
      if (success) {
        const echoMsg = {
          chat_id: cid,
          msg: text,
          sendTime: Math.floor(Date.now() / 1000),
          incoming: false,
          lobby_peer_gxs_id: State.selectedOwnGxsIdForChat,
        };
        State.chatMessages.push(echoMsg);
        if (State.selectedId) {
          State.chatHistoryMap[State.selectedId] = {
            lastMsg: text,
            lastTime: Math.floor(Date.now() / 1000),
          };
        }
        m.redraw();
        setTimeout(() => {
          const element = document.querySelector('.chat-messages');
          if (element) element.scrollTop = element.scrollHeight;
        }, 100);
      } else {
        console.error('[RS] Failed to send distant chat message:', data);
        alert('Failed to send distant chat message. The image/payload exceeds RetroShare max chat packet size.');
        State.chatInputMsg = text;
        m.redraw();
      }
    }
  );
}

function preloadAllChatHistory() {
  rs.rsJsonApiRequest('/rsIdentity/getIdentitiesSummaries', {}, (data) => {
    const ids = (data && data.ids) ? data.ids : (rs.userList.users || []);
    if (!ids || ids.length === 0) return;

    ids.forEach((u) => {
      const gxsId = typeof u === 'object' ? u.mGroupId : u;
      if (!gxsId) return;

      // Check Distant Chat History (type: 2 - TYPE_PRIVATE_DISTANT)
      const distantPeerId = {
        broadcast_status_peer_id: '00000000000000000000000000000000',
        type: 2, // TYPE_PRIVATE_DISTANT
        peer_id: '00000000000000000000000000000000',
        distant_chat_id: gxsId,
        lobby_id: { xstr64: '0' },
      };

      rs.rsJsonApiRequest(
        '/rsHistory/getMessages',
        {
          chatPeerId: distantPeerId,
          loadCount: 20,
        },
        (msgData, success) => {
          if (success && msgData && msgData.msgs) {
            const userMsgs = msgData.msgs.filter(
              (m) => !m.isSystem && !isSystemMsg(m.message || m.msg)
            );
            if (userMsgs.length > 0) {
              const last = userMsgs[userMsgs.length - 1];
              State.chatHistoryMap[gxsId] = {
                lastMsg: last.message || last.msg || '',
                lastTime: last.sendTime || last.recvTime || Math.floor(Date.now() / 1000),
              };
              m.redraw();
            }
          }
        }
      );

      // Also check Private Chat History (type: 1) if PGP ID is known
      const details = State.gxsIdToDetailsMap[gxsId];
      const pgpId = details ? details.mPgpId : (typeof u === 'object' ? u.mPgpId : null);
      if (pgpId && pgpId !== '0000000000000000') {
        const privatePeerId = {
          broadcast_status_peer_id: '00000000000000000000000000000000',
          type: 1, // PRIVATE
          peer_id: pgpId,
          distant_chat_id: '00000000000000000000000000000000',
          lobby_id: { xstr64: '0' },
        };

        rs.rsJsonApiRequest(
          '/rsHistory/getMessages',
          {
            chatPeerId: privatePeerId,
            loadCount: 20,
          },
          (msgData, success) => {
            if (success && msgData && msgData.msgs) {
              const userMsgs = msgData.msgs.filter(
                (m) => !m.isSystem && !isSystemMsg(m.message || m.msg)
              );
              if (userMsgs.length > 0) {
                const last = userMsgs[userMsgs.length - 1];
                const existing = State.chatHistoryMap[gxsId];
                const lastTime = last.sendTime || last.recvTime || Math.floor(Date.now() / 1000);
                if (!existing || lastTime > existing.lastTime) {
                  State.chatHistoryMap[gxsId] = {
                    lastMsg: last.message || last.msg || '',
                    lastTime,
                  };
                  m.redraw();
                }
              }
            }
          }
        );
      }
    });
  });
}

function loadAllHistoryForSelectedPeer(callback) {
  if (!State.selectedId) return;

  State.isHistoryLoading = true;
  State.fullHistoryMessages = [];
  m.redraw();

  const queries = [];

  // Query 1: Distant Chat History by active chatPid (type: 2 - TYPE_PRIVATE_DISTANT)
  if (State.chatPid) {
    queries.push({
      broadcast_status_peer_id: '00000000000000000000000000000000',
      type: 2, // TYPE_PRIVATE_DISTANT
      peer_id: '00000000000000000000000000000000',
      distant_chat_id: State.chatPid,
      lobby_id: { xstr64: '0' },
    });
  }

  // Query 2: Distant Chat History by selectedId if different (type: 2 - TYPE_PRIVATE_DISTANT)
  if (State.selectedId && State.selectedId !== State.chatPid) {
    queries.push({
      broadcast_status_peer_id: '00000000000000000000000000000000',
      type: 2, // TYPE_PRIVATE_DISTANT
      peer_id: '00000000000000000000000000000000',
      distant_chat_id: State.selectedId,
      lobby_id: { xstr64: '0' },
    });
  }

  // Query 3: Private Chat History by PGP ID if available (type: 1 - TYPE_PRIVATE)
  const details = State.gxsIdToDetailsMap[State.selectedId];
  const pgpId = details ? details.mPgpId : null;
  if (pgpId && pgpId !== '0000000000000000') {
    queries.push({
      broadcast_status_peer_id: '00000000000000000000000000000000',
      type: 1, // TYPE_PRIVATE
      peer_id: pgpId,
      distant_chat_id: '00000000000000000000000000000000',
      lobby_id: { xstr64: '0' },
    });
  }

  let accumulatedMsgs = [];
  let completed = 0;

  queries.forEach((chatPeerId) => {
    rs.rsJsonApiRequest(
      '/rsHistory/getMessages',
      {
        chatPeerId,
        loadCount: 0, // 0 = load all messages in C++
      },
      (msgData, success) => {
        if (success && msgData && msgData.msgs) {
          accumulatedMsgs = accumulatedMsgs.concat(msgData.msgs);
        }
        completed++;
        if (completed === queries.length) {
          const map = new Map();
          accumulatedMsgs.forEach((mItem) => {
            const text = mItem.msg || mItem.message || '';
            const key = `${mItem.sendTime || mItem.recvTime}_${text}`;
            if (!map.has(key)) map.set(key, mItem);
          });
          const uniqueMsgs = Array.from(map.values());
          uniqueMsgs.sort((a, b) => (a.sendTime || a.recvTime) - (b.sendTime || b.recvTime));
          State.fullHistoryMessages = uniqueMsgs;
          State.isHistoryLoading = false;
          m.redraw();
          if (callback) callback();
        }
      }
    );
  });
}

module.exports = {
  State,
  getDistantChatSession,
  isSystemMsg,
  preloadAllChatHistory,
  loadAllHistoryForSelectedPeer,
  fetchIdDetails,
  loadGxsIdentities,
  loadOwnGxsIds,
  get64Num,
  getServiceName,
  createUsageString,
  getSafeAvatar,
  getOnlineSslId,
  isIdentityOnline,
  syncFilter,
  getStatusColor,
  getStatusTooltip,
  pollDistantChatStatus,
  startStatusPolling,
  stopStatusPolling,
  initializeDistantChat,
  loadChatMessages,
  sendDistantChatMessage,
};

 
}); 
require.register("people/people_util", function(exports, require, module) { 
const rs = require('rswebui');
const m = require('mithril');
const jdenticon = require('jdenticon');

function checksudo(id) {
  return id === '0000000000000000';
}

function getAvatarColor(seed) {
  let hash = 0;
  if (seed) {
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 60%)`;
}

const UserAvatar = () => ({
  view: (v) => {
    const imageURI = v.attrs.avatar;
    const identityId = v.attrs.identityId || v.attrs.id;
    const rawSize = v.attrs.size || 48;
    const sizeStr = typeof rawSize === 'number' ? `${rawSize}px` : rawSize;
    const pxSize = typeof rawSize === 'number' ? rawSize : parseInt(rawSize) || 48;
    const isSquare = !!v.attrs.isSquare;

    if (imageURI && imageURI.mData && imageURI.mData.base64 !== '') {
      return m('img.avatar', {
        src: 'data:image/png;base64,' + imageURI.mData.base64,
        style: {
          width: sizeStr,
          height: sizeStr,
          minWidth: sizeStr,
          minHeight: sizeStr,
          flexShrink: '0',
          aspectRatio: '1',
          objectFit: 'cover',
          borderRadius: isSquare ? '0' : '50%',
        }
      });
    }

    if (identityId && identityId !== '0000000000000000') {
      const svgString = jdenticon.toSvg(identityId, pxSize);
      return m('div.jdenticon-avatar', {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: sizeStr,
          height: sizeStr,
          minWidth: sizeStr,
          minHeight: sizeStr,
          flexShrink: '0',
          aspectRatio: '1',
          borderRadius: isSquare ? '0' : '50%',
          overflow: 'hidden',
          verticalAlign: 'middle',
          marginRight: '0.3em',
        },
        oncreate: (vnode) => {
          const svg = vnode.dom.querySelector('svg');
          if (svg) {
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.display = 'block';
          }
        }
      }, m.trust(svgString));
    }

    const seed = v.attrs.seed || v.attrs.firstLetter || '';
    const backgroundColor = getAvatarColor(seed);

    return m(
      'div.defaultAvatar',
      {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: sizeStr,
          height: sizeStr,
          minWidth: sizeStr,
          minHeight: sizeStr,
          flexShrink: '0',
          aspectRatio: '1',
          borderRadius: isSquare ? '0' : '50%',
          backgroundColor,
        }
      },
      m('p', {
        style: {
          color: '#ffffff',
          fontWeight: '900',
          margin: '0',
          fontSize: `calc(${sizeStr} * 0.55)`,
        }
      }, v.attrs.firstLetter || '?')
    );
  },
});

const identityDetailsCache = new Map();

function loadIdentityDetails(id) {
  if (!id || id === '0000000000000000') return Promise.resolve(null);
  const cached = identityDetailsCache.get(id);
  if (cached && Object.prototype.hasOwnProperty.call(cached, 'details')) {
    return Promise.resolve(cached.details);
  }
  if (cached && cached.promise) return cached.promise;

  const promise = rs.rsJsonApiRequest('/rsIdentity/getIdDetails', { id })
    .then((response) => {
      const details = response && response.body ? response.body.details : null;
      identityDetailsCache.set(id, { details });
      m.redraw();
      return details;
    })
    .catch(() => {
      identityDetailsCache.set(id, { details: null });
      return null;
    });

  identityDetailsCache.set(id, { promise });
  return promise;
}

const IdentityAvatar = () => ({
  oninit: (vnode) => loadIdentityDetails(vnode.attrs.identityId),
  onbeforeupdate: (vnode, old) => {
    if (vnode.attrs.identityId !== old.attrs.identityId) {
      loadIdentityDetails(vnode.attrs.identityId);
    }
  },
  view: (vnode) => {
    const id = vnode.attrs.identityId;
    const cached = identityDetailsCache.get(id);
    const details = cached && cached.details;
    const name = vnode.attrs.name || (details && details.mNickname) || '';

    return m(UserAvatar, {
      avatar: details && details.mAvatar,
      identityId: id,
      firstLetter: name.slice(0, 1).toUpperCase(),
      seed: id || name,
      size: vnode.attrs.size || 38,
    });
  },
});

function contactlist(list) {
  if (list === undefined) return [];
  return list.filter((id) => {
    id.isSearched = true;
    const entry = rs.userList.userMap[id.mGroupId];
    return entry && entry.isContact;
  });
}

function sortUsers(list) {
  if (list !== undefined) {
    const result = [];
    list.map((id) => {
      id.isSearched = true;
      result.push(id);
    });

    result.sort((a, b) => a.mGroupName.localeCompare(b.mGroupName));
    return result;
  }
  return list;
}

function sortIds(list) {
  if (list !== undefined) {
    const result = [...list];

    result.sort((a, b) => {
      const nameA = rs.userList.username(a) || String(a);
      const nameB = rs.userList.username(b) || String(b);
      return nameA.localeCompare(nameB);
    });
    return result;
  }
  return list;
}

const OWN_IDS_CACHE_MS = 30000;
const ownIdsCache = {
  all: { ids: null, loadedAt: 0, promise: null },
  signed: { ids: null, loadedAt: 0, promise: null },
};

async function loadOwnIds(onlySigned) {
  if (onlySigned) {
    const response = await rs.rsJsonApiRequest('/rsIdentity/getOwnSignedIds', {});
    return (response && response.body && response.body.ids) || [];
  }

  // The complete list is these two calls put together. /rsIdentity/getOwnIds
  // is not an alternative to them: it is the deprecated one, it carries no
  // @jsonapi annotation, and the core answers 404.
  const [signedResponse, pseudonymousResponse] = await Promise.all([
    rs.rsJsonApiRequest('/rsIdentity/getOwnSignedIds', {}),
    rs.rsJsonApiRequest('/rsIdentity/getOwnPseudonimousIds', {}),
  ]);
  const signedIds = (signedResponse && signedResponse.body && signedResponse.body.ids) || [];
  const pseudonymousIds = (pseudonymousResponse && pseudonymousResponse.body && pseudonymousResponse.body.ids) || [];
  return pseudonymousIds.concat(signedIds);
}

async function ownIds(consumer = () => { }, onlySigned = false) {
  const cache = onlySigned ? ownIdsCache.signed : ownIdsCache.all;
  try {
    if (cache.ids && Date.now() - cache.loadedAt < OWN_IDS_CACHE_MS) {
      const cachedIds = [...cache.ids];
      consumer(cachedIds);
      return cachedIds;
    }

    if (!cache.promise) {
      cache.promise = loadOwnIds(onlySigned)
        .then((ids) => {
          cache.ids = sortIds(Array.from(new Set(ids || [])));
          cache.loadedAt = Date.now();
          return cache.ids;
        })
        .finally(() => { cache.promise = null; });
    }

    const ids = [...await cache.promise];
    consumer(ids);
    return ids;
  } catch (error) {
    console.warn('Unable to load own identities', error);
    consumer([]);
    return [];
  }
}
const SearchBar = () => {
  let searchString = '';

  return {
    view: () =>
      m('input.searchbar', {
        type: 'text',
        placeholder: 'search',
        value: searchString,
        oninput: (e) => {
          searchString = e.target.value.toLowerCase();

          rs.userList.users.map((id) => {
            if (id.mGroupName.toLowerCase().indexOf(searchString) > -1) {
              id.isSearched = true;
            } else {
              id.isSearched = false;
            }
          });
        },
      }),
  };
};

const regularcontactInfo = () => {
  let details = {};

  return {
    oninit: (v) =>
      rs.rsJsonApiRequest(
        '/rsIdentity/getIdDetails',
        {
          id: v.attrs.id.mGroupId,
        },
        (data) => {
          details = data.details;
        }
      ),
    view: (v) =>
      m(
        '.identity',
        {
          key: details.mId,
          style: 'display:' + (v.attrs.id.isSearched ? 'block' : 'none'),
        },
        [
          m('h4', details.mNickname),
          details.mNickname &&
          m(UserAvatar, {
            avatar: details.mAvatar,
            firstLetter: details.mNickname.slice(0, 1).toUpperCase(),
            identityId: details.mId || v.attrs.id.mGroupId,
          }),
          m('.details', [
            m('p', 'ID:'),
            m('p', details.mId),
            m('p', 'Type:'),
            m('p', details.mFlags === 14 ? 'Signed ID' : 'Anonymous ID'),
            m('p', 'Owner node ID:'),
            m('p', details.mPgpId),
            m('p', 'Created on:'),
            m(
              'p',
              typeof details.mPublishTS === 'object'
                ? new Date(details.mPublishTS.xint64 * 1000).toLocaleString()
                : 'undefiend'
            ),
            m('p', 'Last used:'),
            m(
              'p',
              typeof details.mLastUsageTS === 'object'
                ? new Date(details.mLastUsageTS.xint64 * 1000).toLocaleDateString()
                : 'undefiend'
            ),
          ]),
          m(
            'button',
            {
              onclick: () =>
                m.route.set('/chat/:userid/createdistantchat', {
                  userid: v.attrs.id.mGroupId,
                }),
            },
            'Chat'
          ),
          m('button.red', {}, 'Mail'),
        ]
      ),
  };
};

module.exports = {
  sortUsers,
  sortIds,
  ownIds,
  checksudo,
  UserAvatar,
  IdentityAvatar,
  contactlist,
  SearchBar,
  regularcontactInfo,
};
 
}); 
