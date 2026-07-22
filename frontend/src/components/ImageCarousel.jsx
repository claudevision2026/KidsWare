export default function ImageCarousel({ images, carouselId, heightClass = 'ktw-card-img' }) {
  if (!images || images.length === 0) {
    return <div className={`${heightClass} d-flex align-items-center justify-content-center text-muted`}>No image</div>
  }

  if (images.length === 1) {
    return <img src={images[0]} alt="" className={`w-100 ${heightClass}`} />
  }

  return (
    <div id={carouselId} className="carousel slide" data-bs-ride="false">
      <div className="carousel-inner">
        {images.map((src, idx) => (
          <div className={`carousel-item ${idx === 0 ? 'active' : ''}`} key={src + idx}>
            <img src={src} alt="" className={`w-100 ${heightClass}`} />
          </div>
        ))}
      </div>
      <button className="carousel-control-prev" type="button" data-bs-target={`#${carouselId}`} data-bs-slide="prev">
        <span className="carousel-control-prev-icon" aria-hidden="true" />
      </button>
      <button className="carousel-control-next" type="button" data-bs-target={`#${carouselId}`} data-bs-slide="next">
        <span className="carousel-control-next-icon" aria-hidden="true" />
      </button>
    </div>
  )
}
