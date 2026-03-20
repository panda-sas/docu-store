import io

import fitz  # PyMuPDF
from PIL import Image

from application.dtos.pdf_dtos import PDFContent
from application.ports.blob_store import BlobStore
from application.ports.pdf_service import PDFService
from domain.exceptions import InfrastructureError, ValidationError

THUMBNAIL_MAX_WIDTH = 400
THUMBNAIL_JPEG_QUALITY = 85


class PageContent:
    """Simple container for page content to mimic langchain Document."""

    def __init__(self, page_content: str, page_number: int) -> None:
        self.page_content = page_content
        self.page_number = page_number


class PyMuPDFService(PDFService):
    def __init__(self, blob_store: BlobStore) -> None:
        self.blob_store = blob_store

    @staticmethod
    def _make_thumbnail(png_bytes: bytes) -> io.BytesIO:
        """Resize a full-resolution PNG to a small JPEG thumbnail.

        Args:
            png_bytes: Raw PNG image bytes

        Returns:
            BytesIO stream of the JPEG thumbnail

        """
        with Image.open(io.BytesIO(png_bytes)) as img:
            img = img.convert("RGB")
            w, h = img.size
            if w > THUMBNAIL_MAX_WIDTH:
                ratio = THUMBNAIL_MAX_WIDTH / w
                img = img.resize(
                    (THUMBNAIL_MAX_WIDTH, int(h * ratio)),
                    Image.LANCZOS,
                )
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=THUMBNAIL_JPEG_QUALITY)
            buf.seek(0)
            return buf

    def _extract_pdf_content(
        self,
        pdf_path: str,
        dpi: int = 300,
    ) -> tuple[list[PageContent], list[io.BytesIO], list[io.BytesIO]]:
        """Extract text, PNG images, and JPEG thumbnails from PDF using PyMuPDF.

        Opens the PDF once and extracts text content, renders pages to full-res
        PNG, and generates lightweight JPEG thumbnails for UI display.

        Args:
            pdf_path: Path to the PDF file
            dpi: Resolution for converting PDF pages (default: 300)

        Returns:
            Tuple of (page_content_list, png_streams_list, thumbnail_streams_list)

        """
        page_contents = []
        png_streams = []
        thumb_streams = []

        # Open PDF with PyMuPDF
        doc = fitz.open(pdf_path)

        try:
            # Process each page
            for page_num in range(len(doc)):
                page = doc[page_num]

                # Extract text content
                text = page.get_text()
                page_contents.append(PageContent(text, page_num))

                # Render to PNG
                zoom = dpi / 72
                mat = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=mat, alpha=False)
                png_bytes = pix.tobytes("png")

                img_byte_arr = io.BytesIO(png_bytes)
                img_byte_arr.seek(0)
                png_streams.append(img_byte_arr)

                # Generate lightweight thumbnail
                thumb_streams.append(self._make_thumbnail(png_bytes))
        finally:
            # Always close the document to free resources
            doc.close()

        return page_contents, png_streams, thumb_streams

    def parse(self, storage_key: str) -> PDFContent:
        """Load PDF from blob store and returns its text content.

        Args:
            storage_key: Key to retrieve the PDF from blob store

        Returns:
            PDFContent with parsed PDF data

        Raises:
            ValidationError: If storage_key is invalid
            InfrastructureError: If PDF retrieval or parsing fails

        """
        # Validate input
        if not storage_key or not isinstance(storage_key, str):
            msg = f"Invalid storage_key: {storage_key!r}"
            raise ValidationError(msg)

        try:
            # Get file path from blob store using context manager
            with self.blob_store.get_file(storage_key) as file_path:
                # Extract text content, render PNG images, and generate thumbnails
                loaded_docs, pages_png, pages_thumb = self._extract_pdf_content(str(file_path))
        except Exception as e:
            msg = f"Error parsing PDF (key: {storage_key}): {e!s}"
            raise InfrastructureError(msg) from e

        if not loaded_docs:
            msg = f"No content extracted from PDF: {storage_key}"
            raise InfrastructureError(msg)

        first_page_content = loaded_docs[0].page_content
        combined_content = " ".join(doc.page_content for doc in loaded_docs)
        last_page_content = loaded_docs[-1].page_content

        return PDFContent(
            file_path=storage_key,
            pages=loaded_docs,
            pages_png=pages_png,
            pages_thumb=pages_thumb,
            combined_content=combined_content,
            first_page_content=first_page_content,
            last_page_content=last_page_content,
        )
