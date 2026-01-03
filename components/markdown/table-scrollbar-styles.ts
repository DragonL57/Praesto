// Inject CSS to hide scrollbars while maintaining functionality
const hideScrollbarCSS = `
  /* Hide scrollbars for draggable tables */
  [data-draggable="true"] {
    scrollbar-width: none !important; /* Firefox */
    -ms-overflow-style: none !important; /* Internet Explorer 10+ */
  }

  [data-draggable="true"]::-webkit-scrollbar {
    display: none !important; /* Safari and Chrome */
    width: 0 !important;
    height: 0 !important;
  }

  /* Ensure momentum scrolling works on iOS */
  [data-draggable="true"] {
    -webkit-overflow-scrolling: touch !important;
  }
`;

// Check if styles are already injected
if (
  typeof window !== 'undefined' &&
  !document.querySelector('#draggable-table-styles')
) {
  const styleElement = document.createElement('style');
  styleElement.id = 'draggable-table-styles';
  styleElement.textContent = hideScrollbarCSS;
  document.head.appendChild(styleElement);
}
