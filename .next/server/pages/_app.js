/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "./components/Navbar.tsx":
/*!*******************************!*\
  !*** ./components/Navbar.tsx ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_link__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/link */ \"./node_modules/next/link.js\");\n/* harmony import */ var next_link__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(next_link__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/router */ \"./node_modules/next/router.js\");\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_router__WEBPACK_IMPORTED_MODULE_2__);\n\n\n\nconst Navbar = ()=>{\n    const router = (0,next_router__WEBPACK_IMPORTED_MODULE_2__.useRouter)();\n    const isActive = (path)=>{\n        return router.pathname === path || router.pathname.startsWith(`${path}/`);\n    };\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"nav\", {\n        className: \"bg-blue-800 text-white shadow-md\",\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n            className: \"container mx-auto px-4\",\n            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"flex items-center justify-between h-16\",\n                children: [\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                        className: \"flex-shrink-0\",\n                        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)((next_link__WEBPACK_IMPORTED_MODULE_1___default()), {\n                            href: \"/\",\n                            className: \"flex items-center\",\n                            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"span\", {\n                                className: \"text-xl font-bold\",\n                                children: \"PHC Data Collection\"\n                            }, void 0, false, {\n                                fileName: \"/Users/drewbernard/Documents/Visual Studio/PHC Data Collection/components/Navbar.tsx\",\n                                lineNumber: 17,\n                                columnNumber: 15\n                            }, undefined)\n                        }, void 0, false, {\n                            fileName: \"/Users/drewbernard/Documents/Visual Studio/PHC Data Collection/components/Navbar.tsx\",\n                            lineNumber: 16,\n                            columnNumber: 13\n                        }, undefined)\n                    }, void 0, false, {\n                        fileName: \"/Users/drewbernard/Documents/Visual Studio/PHC Data Collection/components/Navbar.tsx\",\n                        lineNumber: 15,\n                        columnNumber: 11\n                    }, undefined),\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                        className: \"flex space-x-4\",\n                        children: [\n                            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)((next_link__WEBPACK_IMPORTED_MODULE_1___default()), {\n                                href: \"/\",\n                                className: `text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium ${isActive(\"/\") && !isActive(\"/dashboard\") && !isActive(\"/reports\") ? \"bg-blue-900\" : \"\"}`,\n                                children: \"Centers\"\n                            }, void 0, false, {\n                                fileName: \"/Users/drewbernard/Documents/Visual Studio/PHC Data Collection/components/Navbar.tsx\",\n                                lineNumber: 23,\n                                columnNumber: 13\n                            }, undefined),\n                            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)((next_link__WEBPACK_IMPORTED_MODULE_1___default()), {\n                                href: \"/dashboard\",\n                                className: `text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium ${isActive(\"/dashboard\") ? \"bg-blue-900\" : \"\"}`,\n                                children: \"Dashboard\"\n                            }, void 0, false, {\n                                fileName: \"/Users/drewbernard/Documents/Visual Studio/PHC Data Collection/components/Navbar.tsx\",\n                                lineNumber: 35,\n                                columnNumber: 13\n                            }, undefined),\n                            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)((next_link__WEBPACK_IMPORTED_MODULE_1___default()), {\n                                href: \"/reports\",\n                                className: `text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium ${isActive(\"/reports\") ? \"bg-blue-900\" : \"\"}`,\n                                children: \"Reports\"\n                            }, void 0, false, {\n                                fileName: \"/Users/drewbernard/Documents/Visual Studio/PHC Data Collection/components/Navbar.tsx\",\n                                lineNumber: 43,\n                                columnNumber: 13\n                            }, undefined)\n                        ]\n                    }, void 0, true, {\n                        fileName: \"/Users/drewbernard/Documents/Visual Studio/PHC Data Collection/components/Navbar.tsx\",\n                        lineNumber: 21,\n                        columnNumber: 11\n                    }, undefined)\n                ]\n            }, void 0, true, {\n                fileName: \"/Users/drewbernard/Documents/Visual Studio/PHC Data Collection/components/Navbar.tsx\",\n                lineNumber: 14,\n                columnNumber: 9\n            }, undefined)\n        }, void 0, false, {\n            fileName: \"/Users/drewbernard/Documents/Visual Studio/PHC Data Collection/components/Navbar.tsx\",\n            lineNumber: 13,\n            columnNumber: 7\n        }, undefined)\n    }, void 0, false, {\n        fileName: \"/Users/drewbernard/Documents/Visual Studio/PHC Data Collection/components/Navbar.tsx\",\n        lineNumber: 12,\n        columnNumber: 5\n    }, undefined);\n};\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Navbar);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9jb21wb25lbnRzL05hdmJhci50c3giLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBNkI7QUFDVztBQUV4QyxNQUFNRSxTQUFTO0lBQ2IsTUFBTUMsU0FBU0Ysc0RBQVNBO0lBRXhCLE1BQU1HLFdBQVcsQ0FBQ0M7UUFDaEIsT0FBT0YsT0FBT0csUUFBUSxLQUFLRCxRQUFRRixPQUFPRyxRQUFRLENBQUNDLFVBQVUsQ0FBQyxDQUFDLEVBQUVGLEtBQUssQ0FBQyxDQUFDO0lBQzFFO0lBRUEscUJBQ0UsOERBQUNHO1FBQUlDLFdBQVU7a0JBQ2IsNEVBQUNDO1lBQUlELFdBQVU7c0JBQ2IsNEVBQUNDO2dCQUFJRCxXQUFVOztrQ0FDYiw4REFBQ0M7d0JBQUlELFdBQVU7a0NBQ2IsNEVBQUNULGtEQUFJQTs0QkFBQ1csTUFBSzs0QkFBSUYsV0FBVTtzQ0FDdkIsNEVBQUNHO2dDQUFLSCxXQUFVOzBDQUFvQjs7Ozs7Ozs7Ozs7Ozs7OztrQ0FJeEMsOERBQUNDO3dCQUFJRCxXQUFVOzswQ0FFYiw4REFBQ1Qsa0RBQUlBO2dDQUNIVyxNQUFLO2dDQUNMRixXQUFXLENBQUMsc0VBQXNFLEVBQ2hGTCxTQUFTLFFBQ1QsQ0FBQ0EsU0FBUyxpQkFDVixDQUFDQSxTQUFTLGNBQ04sZ0JBQ0EsR0FDTCxDQUFDOzBDQUNIOzs7Ozs7MENBR0QsOERBQUNKLGtEQUFJQTtnQ0FDSFcsTUFBSztnQ0FDTEYsV0FBVyxDQUFDLHNFQUFzRSxFQUNoRkwsU0FBUyxnQkFBZ0IsZ0JBQWdCLEdBQzFDLENBQUM7MENBQ0g7Ozs7OzswQ0FHRCw4REFBQ0osa0RBQUlBO2dDQUNIVyxNQUFLO2dDQUNMRixXQUFXLENBQUMsc0VBQXNFLEVBQ2hGTCxTQUFTLGNBQWMsZ0JBQWdCLEdBQ3hDLENBQUM7MENBQ0g7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFRYjtBQUVBLGlFQUFlRixNQUFNQSxFQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vcGhjLWRhdGEtY29sbGVjdGlvbi8uL2NvbXBvbmVudHMvTmF2YmFyLnRzeD8xYjgzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBMaW5rIGZyb20gXCJuZXh0L2xpbmtcIjtcbmltcG9ydCB7IHVzZVJvdXRlciB9IGZyb20gXCJuZXh0L3JvdXRlclwiO1xuXG5jb25zdCBOYXZiYXIgPSAoKSA9PiB7XG4gIGNvbnN0IHJvdXRlciA9IHVzZVJvdXRlcigpO1xuXG4gIGNvbnN0IGlzQWN0aXZlID0gKHBhdGg6IHN0cmluZykgPT4ge1xuICAgIHJldHVybiByb3V0ZXIucGF0aG5hbWUgPT09IHBhdGggfHwgcm91dGVyLnBhdGhuYW1lLnN0YXJ0c1dpdGgoYCR7cGF0aH0vYCk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8bmF2IGNsYXNzTmFtZT1cImJnLWJsdWUtODAwIHRleHQtd2hpdGUgc2hhZG93LW1kXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbnRhaW5lciBteC1hdXRvIHB4LTRcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gaC0xNlwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC1zaHJpbmstMFwiPlxuICAgICAgICAgICAgPExpbmsgaHJlZj1cIi9cIiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlclwiPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhsIGZvbnQtYm9sZFwiPlBIQyBEYXRhIENvbGxlY3Rpb248L3NwYW4+XG4gICAgICAgICAgICA8L0xpbms+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggc3BhY2UteC00XCI+XG4gICAgICAgICAgICB7LyogRVhQTElDSVRMWSBVU0lORyBcIkNlbnRlcnNcIiBIRVJFICovfVxuICAgICAgICAgICAgPExpbmtcbiAgICAgICAgICAgICAgaHJlZj1cIi9cIlxuICAgICAgICAgICAgICBjbGFzc05hbWU9e2B0ZXh0LXdoaXRlIGhvdmVyOmJnLWJsdWUtNzAwIHB4LTMgcHktMiByb3VuZGVkLW1kIHRleHQtc20gZm9udC1tZWRpdW0gJHtcbiAgICAgICAgICAgICAgICBpc0FjdGl2ZShcIi9cIikgJiZcbiAgICAgICAgICAgICAgICAhaXNBY3RpdmUoXCIvZGFzaGJvYXJkXCIpICYmXG4gICAgICAgICAgICAgICAgIWlzQWN0aXZlKFwiL3JlcG9ydHNcIilcbiAgICAgICAgICAgICAgICAgID8gXCJiZy1ibHVlLTkwMFwiXG4gICAgICAgICAgICAgICAgICA6IFwiXCJcbiAgICAgICAgICAgICAgfWB9XG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIENlbnRlcnNcbiAgICAgICAgICAgIDwvTGluaz5cbiAgICAgICAgICAgIDxMaW5rXG4gICAgICAgICAgICAgIGhyZWY9XCIvZGFzaGJvYXJkXCJcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgdGV4dC13aGl0ZSBob3ZlcjpiZy1ibHVlLTcwMCBweC0zIHB5LTIgcm91bmRlZC1tZCB0ZXh0LXNtIGZvbnQtbWVkaXVtICR7XG4gICAgICAgICAgICAgICAgaXNBY3RpdmUoXCIvZGFzaGJvYXJkXCIpID8gXCJiZy1ibHVlLTkwMFwiIDogXCJcIlxuICAgICAgICAgICAgICB9YH1cbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgRGFzaGJvYXJkXG4gICAgICAgICAgICA8L0xpbms+XG4gICAgICAgICAgICA8TGlua1xuICAgICAgICAgICAgICBocmVmPVwiL3JlcG9ydHNcIlxuICAgICAgICAgICAgICBjbGFzc05hbWU9e2B0ZXh0LXdoaXRlIGhvdmVyOmJnLWJsdWUtNzAwIHB4LTMgcHktMiByb3VuZGVkLW1kIHRleHQtc20gZm9udC1tZWRpdW0gJHtcbiAgICAgICAgICAgICAgICBpc0FjdGl2ZShcIi9yZXBvcnRzXCIpID8gXCJiZy1ibHVlLTkwMFwiIDogXCJcIlxuICAgICAgICAgICAgICB9YH1cbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgUmVwb3J0c1xuICAgICAgICAgICAgPC9MaW5rPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvbmF2PlxuICApO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgTmF2YmFyO1xuIl0sIm5hbWVzIjpbIkxpbmsiLCJ1c2VSb3V0ZXIiLCJOYXZiYXIiLCJyb3V0ZXIiLCJpc0FjdGl2ZSIsInBhdGgiLCJwYXRobmFtZSIsInN0YXJ0c1dpdGgiLCJuYXYiLCJjbGFzc05hbWUiLCJkaXYiLCJocmVmIiwic3BhbiJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./components/Navbar.tsx\n");

/***/ }),

/***/ "./pages/_app.tsx":
/*!************************!*\
  !*** ./pages/_app.tsx ***!
  \************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_head__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/head */ \"next/head\");\n/* harmony import */ var next_head__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(next_head__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _components_Navbar__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../components/Navbar */ \"./components/Navbar.tsx\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../styles/globals.css */ \"./styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var leaflet_dist_leaflet_css__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! leaflet/dist/leaflet.css */ \"./node_modules/leaflet/dist/leaflet.css\");\n/* harmony import */ var leaflet_dist_leaflet_css__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(leaflet_dist_leaflet_css__WEBPACK_IMPORTED_MODULE_4__);\n/* harmony import */ var react_toastify_dist_ReactToastify_css__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! react-toastify/dist/ReactToastify.css */ \"./node_modules/react-toastify/dist/ReactToastify.css\");\n/* harmony import */ var react_toastify_dist_ReactToastify_css__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(react_toastify_dist_ReactToastify_css__WEBPACK_IMPORTED_MODULE_5__);\n/* harmony import */ var react_toastify__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! react-toastify */ \"react-toastify\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([react_toastify__WEBPACK_IMPORTED_MODULE_6__]);\nreact_toastify__WEBPACK_IMPORTED_MODULE_6__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n\n\n\n\n\nfunction MyApp({ Component, pageProps }) {\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, {\n        children: [\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)((next_head__WEBPACK_IMPORTED_MODULE_1___default()), {\n                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"meta\", {\n                    name: \"viewport\",\n                    content: \"width=device-width, initial-scale=1\"\n                }, void 0, false, {\n                    fileName: \"/Users/drewbernard/Documents/Visual Studio/PHC Data Collection/pages/_app.tsx\",\n                    lineNumber: 13,\n                    columnNumber: 9\n                }, this)\n            }, void 0, false, {\n                fileName: \"/Users/drewbernard/Documents/Visual Studio/PHC Data Collection/pages/_app.tsx\",\n                lineNumber: 12,\n                columnNumber: 7\n            }, this),\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_Navbar__WEBPACK_IMPORTED_MODULE_2__[\"default\"], {}, void 0, false, {\n                fileName: \"/Users/drewbernard/Documents/Visual Studio/PHC Data Collection/pages/_app.tsx\",\n                lineNumber: 15,\n                columnNumber: 7\n            }, this),\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n                ...pageProps\n            }, void 0, false, {\n                fileName: \"/Users/drewbernard/Documents/Visual Studio/PHC Data Collection/pages/_app.tsx\",\n                lineNumber: 16,\n                columnNumber: 7\n            }, this),\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(react_toastify__WEBPACK_IMPORTED_MODULE_6__.ToastContainer, {\n                position: \"top-right\",\n                autoClose: 3000,\n                hideProgressBar: false,\n                newestOnTop: true,\n                closeOnClick: true,\n                rtl: false,\n                pauseOnFocusLoss: true,\n                draggable: true,\n                pauseOnHover: true\n            }, void 0, false, {\n                fileName: \"/Users/drewbernard/Documents/Visual Studio/PHC Data Collection/pages/_app.tsx\",\n                lineNumber: 17,\n                columnNumber: 7\n            }, this)\n        ]\n    }, void 0, true);\n}\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (MyApp);\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9wYWdlcy9fYXBwLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUM2QjtBQUNhO0FBQ1g7QUFDRztBQUNhO0FBQ0M7QUFFaEQsU0FBU0csTUFBTSxFQUFFQyxTQUFTLEVBQUVDLFNBQVMsRUFBWTtJQUMvQyxxQkFDRTs7MEJBQ0UsOERBQUNMLGtEQUFJQTswQkFDSCw0RUFBQ007b0JBQUtDLE1BQUs7b0JBQVdDLFNBQVE7Ozs7Ozs7Ozs7OzBCQUVoQyw4REFBQ1AsMERBQU1BOzs7OzswQkFDUCw4REFBQ0c7Z0JBQVcsR0FBR0MsU0FBUzs7Ozs7OzBCQUN4Qiw4REFBQ0gsMERBQWNBO2dCQUNiTyxVQUFTO2dCQUNUQyxXQUFXO2dCQUNYQyxpQkFBaUI7Z0JBQ2pCQyxXQUFXO2dCQUNYQyxZQUFZO2dCQUNaQyxLQUFLO2dCQUNMQyxnQkFBZ0I7Z0JBQ2hCQyxTQUFTO2dCQUNUQyxZQUFZOzs7Ozs7OztBQUlwQjtBQUVBLGlFQUFlZCxLQUFLQSxFQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vcGhjLWRhdGEtY29sbGVjdGlvbi8uL3BhZ2VzL19hcHAudHN4PzJmYmUiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBBcHBQcm9wcyB9IGZyb20gXCJuZXh0L2FwcFwiO1xuaW1wb3J0IEhlYWQgZnJvbSBcIm5leHQvaGVhZFwiO1xuaW1wb3J0IE5hdmJhciBmcm9tIFwiLi4vY29tcG9uZW50cy9OYXZiYXJcIjtcbmltcG9ydCBcIi4uL3N0eWxlcy9nbG9iYWxzLmNzc1wiO1xuaW1wb3J0IFwibGVhZmxldC9kaXN0L2xlYWZsZXQuY3NzXCI7XG5pbXBvcnQgXCJyZWFjdC10b2FzdGlmeS9kaXN0L1JlYWN0VG9hc3RpZnkuY3NzXCI7XG5pbXBvcnQgeyBUb2FzdENvbnRhaW5lciB9IGZyb20gXCJyZWFjdC10b2FzdGlmeVwiO1xuXG5mdW5jdGlvbiBNeUFwcCh7IENvbXBvbmVudCwgcGFnZVByb3BzIH06IEFwcFByb3BzKSB7XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxIZWFkPlxuICAgICAgICA8bWV0YSBuYW1lPVwidmlld3BvcnRcIiBjb250ZW50PVwid2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTFcIiAvPlxuICAgICAgPC9IZWFkPlxuICAgICAgPE5hdmJhciAvPlxuICAgICAgPENvbXBvbmVudCB7Li4ucGFnZVByb3BzfSAvPlxuICAgICAgPFRvYXN0Q29udGFpbmVyXG4gICAgICAgIHBvc2l0aW9uPVwidG9wLXJpZ2h0XCJcbiAgICAgICAgYXV0b0Nsb3NlPXszMDAwfVxuICAgICAgICBoaWRlUHJvZ3Jlc3NCYXI9e2ZhbHNlfVxuICAgICAgICBuZXdlc3RPblRvcFxuICAgICAgICBjbG9zZU9uQ2xpY2tcbiAgICAgICAgcnRsPXtmYWxzZX1cbiAgICAgICAgcGF1c2VPbkZvY3VzTG9zc1xuICAgICAgICBkcmFnZ2FibGVcbiAgICAgICAgcGF1c2VPbkhvdmVyXG4gICAgICAvPlxuICAgIDwvPlxuICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBNeUFwcDtcbiJdLCJuYW1lcyI6WyJIZWFkIiwiTmF2YmFyIiwiVG9hc3RDb250YWluZXIiLCJNeUFwcCIsIkNvbXBvbmVudCIsInBhZ2VQcm9wcyIsIm1ldGEiLCJuYW1lIiwiY29udGVudCIsInBvc2l0aW9uIiwiYXV0b0Nsb3NlIiwiaGlkZVByb2dyZXNzQmFyIiwibmV3ZXN0T25Ub3AiLCJjbG9zZU9uQ2xpY2siLCJydGwiLCJwYXVzZU9uRm9jdXNMb3NzIiwiZHJhZ2dhYmxlIiwicGF1c2VPbkhvdmVyIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./pages/_app.tsx\n");

/***/ }),

/***/ "./styles/globals.css":
/*!****************************!*\
  !*** ./styles/globals.css ***!
  \****************************/
/***/ (() => {



/***/ }),

/***/ "next/dist/compiled/next-server/pages.runtime.dev.js":
/*!**********************************************************************!*\
  !*** external "next/dist/compiled/next-server/pages.runtime.dev.js" ***!
  \**********************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/pages.runtime.dev.js");

/***/ }),

/***/ "next/head":
/*!****************************!*\
  !*** external "next/head" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/head");

/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("react");

/***/ }),

/***/ "react-dom":
/*!****************************!*\
  !*** external "react-dom" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("react-dom");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-dev-runtime");

/***/ }),

/***/ "react-toastify":
/*!*********************************!*\
  !*** external "react-toastify" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = import("react-toastify");;

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@swc","vendor-chunks/react-toastify","vendor-chunks/leaflet"], () => (__webpack_exec__("./pages/_app.tsx")));
module.exports = __webpack_exports__;

})();