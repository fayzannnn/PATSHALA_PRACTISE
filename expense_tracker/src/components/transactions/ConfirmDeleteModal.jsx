import Modal from "../Modal";

function ConfirmDeleteModal({ count = 1, isOpen, onCancel, onConfirm }) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="confirm-delete-backdrop">
      <section className="confirm-delete-modal">
        <div className="confirm-delete-icon">!</div>
        <h2>{count === 1 ? "Delete this transaction?" : `Delete ${count} transactions?`}</h2>
        <p>This cannot be undone.</p>
        <div>
          <button type="button" className="confirm-delete-cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className="confirm-delete-confirm" onClick={onConfirm}>Delete</button>
        </div>
      </section>
    </Modal>
  );
}

export default ConfirmDeleteModal;
