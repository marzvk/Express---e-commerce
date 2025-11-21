

document.addEventListener('DOMContentLoaded', () => {
  const thumbnails = document.querySelectorAll('.screenshot-thumb');
  
  if (thumbnails.length === 0) return; // No hay screenshots
  
  thumbnails.forEach(img => {
    img.addEventListener('click', () => {
      const index = parseInt(img.dataset.index);
      const screenshots = Array.from(thumbnails).map(thumb => thumb.src);
      
      const carouselInner = document.querySelector('#screenshotsCarousel .carousel-inner');
      carouselInner.innerHTML = '';
      
      screenshots.forEach((src, i) => {
        const item = document.createElement('div');
        item.className = 'carousel-item' + (i === index ? ' active' : '');
        
        const imgElement = document.createElement('img');
        imgElement.src = src;
        imgElement.className = 'd-block w-100 carousel-screenshot';
        imgElement.alt = `Screenshot ${i + 1}`;
        
        item.appendChild(imgElement);
        carouselInner.appendChild(item);
      });
      
      const modal = new bootstrap.Modal(document.getElementById('screenshotsModal'));
      modal.show();
    });
  });
});