import { useState } from "react";

// Shows a post's photos one at a time, with arrows + dots.
// Accepts up to 9 photos, shows a grey placeholder if there are none.
function PostCarousel({ mediaUrls }) {
    const [index, setIndex] = useState(0);
    const photos = (mediaUrls || []).slice(0, 9);   // a post can have up to 9 photos
    const total = photos.length;

    // No photos thenkeep the grey placeholder.
    if (total === 0) {
        return <div className="postMediaPlaceholder">Image goes here</div>;
    }

    // Wrap around at both ends.
    const prev = () => setIndex((i) => (i - 1 + total) % total);
    const next = () => setIndex((i) => (i + 1) % total);

    // Is the current item a video? (otherwise treat it as an image)
    const current = photos[index];
    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(current);

    return (
        <div className="postMedia carousel">
            {isVideo ? (
                <video src={current} controls />
            ) : (
                <img src={current} alt={`media ${index + 1}`} />
            )}

            {/* Only show controls when there's more than one photo. */}
            {total > 1 && (
                <>
                    <button className="carouselArrow left" onClick={prev} aria-label="Previous photo">‹</button>
                    <button className="carouselArrow right" onClick={next} aria-label="Next photo">›</button>
                    <div className="carouselCount">{index + 1}/{total}</div>
                    <div className="carouselDots">
                        {photos.map((_, i) => (
                            <span key={i} className={`dot ${i === index ? "active" : ""}`} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default PostCarousel;
