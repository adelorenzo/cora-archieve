// Runtime configuration for Cora
// This file is loaded before the main application
// Can be overridden at Docker runtime

window.APP_CONFIG = {
  // SearXNG URL - defaults to Docker internal network
  // Can be overridden with SEARXNG_URL environment variable
  SEARXNG_URL: window.SEARXNG_URL || 'http://searxng:8080'
};