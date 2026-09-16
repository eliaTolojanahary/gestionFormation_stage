import './Modal.css'

function Modal({ eyebrow, title, titleId, onClose, children, actions }) {
	return (
		<div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
			<section className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
				<div className="modal-heading">
					<div>{eyebrow && <span>{eyebrow}</span>}<h2 id={titleId}>{title}</h2></div>
					<button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
				</div>
				{children}
				{actions && <div className="modal-actions">{actions}</div>}
			</section>
		</div>
	)
}

export default Modal
