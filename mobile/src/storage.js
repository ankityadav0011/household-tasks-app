import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'padosipro_token';
const SERVER_URL_KEY = 'padosipro_server_url';

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);
export const setToken = (token) => SecureStore.setItemAsync(TOKEN_KEY, token);
export const clearToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);

export const getServerUrl = () => SecureStore.getItemAsync(SERVER_URL_KEY);
export const setServerUrl = (url) => SecureStore.setItemAsync(SERVER_URL_KEY, url);
export const clearServerUrl = () => SecureStore.deleteItemAsync(SERVER_URL_KEY);
