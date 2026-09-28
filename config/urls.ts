// ─── Base ───────────────────────────────────────────────────────────────────
export const WEBSITE_URL = 'https://dhatri.store/';
export const PUBLIC_URL = `${WEBSITE_URL}public/`;
export const DRIVERS_API_URL = `${WEBSITE_URL}api/drivers`;

const HOST = process.env.EXPO_PUBLIC_HOST_URL ?? 'https://dhatri-opal.vercel.app';
const isNextJsBackend = HOST.includes('dhatri-opal.vercel.app') || HOST.includes('localhost:3000');
const API  = isNextJsBackend ? `${HOST}/api/v1/app` : `${HOST}/api`;

// ─── Endpoints (ported from Flutter URLs mixin) ──────────────────────────────
export const URLs = {
  HOST,
  API_URL: API,
  WEBSITE_URL,
  PUBLIC_URL,
  DRIVERS_API_URL,

  // Home
  HOME_PAGE:          `${API}/homepage-data`,

  // Products
  ALL_PRODUCTS:       `${API}/seller/products`,
  ALL_RECOMMENDED:    `${API}/seller/product/recomanded-product`,
  ALL_TOP_PICKS:      `${API}/seller/product/top-picks`,
  SORT_PRODUCTS:      `${API}/seller/product/sort-before-filter`,
  SORT_ALL_PRODUCTS:  `${API}/seller/product/filter/fetch-data`,
  FILTER_ALL_PRODUCTS:`${API}/seller/product/filter/filter-product-page-by-type`,
  FILTER_SELLER_PRODUCTS: `${API}/seller/filter-by-type`,
  PRODUCT_PRICE_SKU_WISE: `${API}/seller/product/get-sku-wise-price`,

  // Categories
  ALL_CATEGORY:       `${API}/product/category`,
  TOP_CATEGORY:       `${API}/product/category/filter/top`,

  // Brands
  ALL_BRAND:          `${API}/product/brand`,

  // Sliders
  ALL_SLIDERS:        `${API}/appearance/sliders`,

  // Tags
  SINGLE_TAG_PRODUCTS:`${API}/product/tag`,

  // Auth
  LOGIN:              isNextJsBackend ? `${API}/auth/login` : `${API}/login`,
  REGISTER:           isNextJsBackend ? `${API}/auth/register` : `${API}/register`,
  LOGOUT:             isNextJsBackend ? `${API}/auth/logout` : `${API}/logout`,
  SOCIAL_LOGIN:       isNextJsBackend ? `${API}/auth/login` : `${API}/social-login`,
  FORGOT_PASSWORD:    isNextJsBackend ? `${API}/auth/login` : `${API}/forgot-password`,
  CHANGE_PASSWORD:    isNextJsBackend ? `${API}/auth/login` : `${API}/change-password`,
  OTP_SEND:           isNextJsBackend ? `${API}/auth/otp/send` : `${API}/general-setting/send-otp`,
  GET_USER:           isNextJsBackend ? `${API}/auth/me` : `${API}/get-user`,

  // Profile
  UPDATE_USER_PROFILE:`${API}/profile/update-information`,
  UPDATE_PROFILE_PHOTO:`${API}/profile/update-photo`,
  CUSTOMER_GET_DATA:  `${API}/profile/get-customer-data`,
  USER_DELETE:        `${API}/customers/delete`,

  // Address
  ADDRESS_LIST:       `${API}/profile/address-list`,
  ADD_ADDRESS:        `${API}/profile/address-store`,
  DELETE_ADDRESS:     `${API}/profile/address-delete`,
  ADDRESS_SET_DEFAULT_BILLING:  `${API}/profile/default-billing-address`,
  ADDRESS_SET_DEFAULT_SHIPPING: `${API}/profile/default-shipping-address`,
  editAddress: (addressId: string | number) =>
    `${API}/profile/address-update/${addressId}`,

  // Location
  COUNTRY:            `${API}/location/country`,
  stateByCountry: (countryId: string | number) =>
    `${API}/location/country/${countryId}/states`,
  cityByState: (stateId: string | number) =>
    `${API}/location/state/${stateId}/cities`,

  // Orders
  ALL_ORDER_LIST:           `${API}/order-list`,
  ALL_ORDER_PENDING_LIST:   `${API}/order-pending-list`,
  ALL_ORDER_CANCEL_LIST:    `${API}/order-cancel-list`,
  ALL_ORDER_REFUND_LIST:    `${API}/order-refund-list`,
  ALL_ORDER_DELIVERY_PROCESS:`${API}/delivery-processes`,
  ORDER_TO_SHIP:            `${API}/order-to-ship`,
  ORDER_TO_RECEIVE:         `${API}/order-to-receive`,
  ORDER_STORE:              `${API}/order-store`,
  ORDER_PAYMENT_STORE:      `${API}/order-payment-info-store`,
  ORDER_REVIEW:             `${API}/order-review`,
  ORDER_CANCEL_STORE:       `${API}/order-manage/cancel-store`,
  CANCEL_REASONS:           `${API}/order-manage/cancel-reason-list`,
  CHECK_PRICE_UPDATE:       `${API}/checkout/check-price-update`,
  allOrdersByStatus: (status: number) =>
    `${API}/order-by-delivery-status?status=${status}`,

  // Cart
  CART:                     `${API}/cart`,
  CART_QUANTITY_UPDATE:     `${API}/cart/update-qty`,
  CART_SELECT_UNSELECT_ALL:    `${API}/cart/select-all`,
  CART_SELECT_UNSELECT_SELLER: `${API}/cart/select-seller-item`,
  CART_SELECT_UNSELECT_SINGLE: `${API}/cart/select-item`,
  CART_REMOVE_ALL:          `${API}/cart/remove-all`,
  CART_REMOVE_CART_ITEM:    `${API}/cart/remove`,
  CART_UPDATE_SHIPPING:     `${API}/cart/update-shipping-method`,

  // Checkout & Payment
  CHECKOUT:                 `${API}/checkout`,
  APPLY_COUPON:             `${API}/checkout/coupon-apply`,
  PAYMENT_GATEWAY:          `${API}/payment-gateway`,
  BANK_INFO:                `${API}/payment-gateway/bank/bank-info`,
  BANK_PAYMENT_DATA_STORE:  `${API}/payment-gateway/bank/payment-data-store`,
  TABBYURL:                 `${API}/tabby-checkout`,

  // Reviews
  WAITING_FOR_REVIEW:       `${API}/order-review/waiting-for-review-list`,
  MY_REVIEWS:               `${API}/order-review/list`,

  // Wishlist & Coupons
  MY_WISHLIST:              `${API}/wishlist`,
  MY_WISHLIST_DELETE:       `${API}/wishlist/delete`,
  MY_COUPONS:               `${API}/coupon`,
  MY_COUPON_DELETE:         `${API}/coupon/delete`,

  // Gift Cards
  ALL_GIFT_CARDS:           `${API}/gift-card/list`,
  GIFT_CARD:                `${API}/gift-card`,
  MY_PURCHASED_GIFT_CARDS:  `${API}/gift-card/my-purchased/list`,

  // Flash Deals
  FLASH_DEALS:              `${API}/marketing/flash-deal`,

  // New User Zone
  NEW_USER_ZONE:            `${API}/marketing/new-user-zone`,
  fetchNewUserProductData: (slug: string) =>
    `${API}/marketing/new-user-zone/${slug}/fetch-product-data`,
  fetchNewUserCategoryAllProducts: (slug: string) =>
    `${API}/marketing/new-user-zone/${slug}/fetch-all-category-data`,
  fetchNewUserCouponAllProducts: (slug: string) =>
    `${API}/marketing/new-user-zone/${slug}/fetch-all-coupon-category-data`,
  fetchNewUserCategoryProducts: (slug: string) =>
    `${API}/marketing/new-user-zone/${slug}/fetch-category-data`,
  fetchNewUserCouponProducts: (slug: string) =>
    `${API}/marketing/new-user-zone/${slug}/fetch-coupon-category-data`,

  // Refunds
  REFUND_REASONS_LIST:      `${API}/refund/reason-list`,
  REFUND_STORE:             `${API}/order-refund/store`,

  // Notifications
  USER_NOTIFICATIONS:       `${API}/user-notifications`,
  NOTIFICATION_SETTINGS:    `${API}/user-notifications-setting`,
  NOTIFICATION_SETTINGS_UPDATE: `${API}/user-notifications-setting/update`,

  // Settings & Misc
  GENERAL_SETTINGS:         `${API}/general-settings`,
  CURRENCY_LIST:            `${API}/currency-list`,
  SHIPPING_LIST:            `${API}/shipping-lists`,
  LIVE_SEARCH:              `${API}/live-search`,
  SELLER_PROFILE:           `${API}/seller-profile`,

  // Tickets
  TICKET_LIST:              `${API}/ticket-list-get-data`,
  TICKET_CATEGORIES:        `${API}/ticket/categories`,
  TICKET_PRIORITIES:        `${API}/ticket/priorities`,
  TICKET_STORE:             `${API}/ticket-store`,
  TICKET_SHOW:              `${API}/ticket-show`,
  TICKET_REPLY:             `${API}/ticket-show/reply`,

  // In-App Purchase
  IN_APP_ADD_TO_CART:       `${API}/in-app-cart-store`,
  CREATE_IN_APP_ORDER:      `${API}/order-store/in-app-purchase`,
  DELETE_IN_APP_CART:       `${API}/in-app-cart-delete`,

  // Merchant
  MERCHANT_LIST:            `${API}/customer/merchants`,

  // Asset helper
  assetUrl: (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const clean = path.startsWith('/') ? path.slice(1) : path;
    return `${HOST}/public/${clean}`;
  },
};
