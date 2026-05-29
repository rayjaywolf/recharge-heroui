"use client";

import { Modal } from "@heroui/react";

import { MpinForm } from "@/components/profile/mpin-form";

type MpinSetupModalProps = {
  open: boolean;
  onCompleted?: () => void;
};

export function MpinSetupModal({ open, onCompleted }: MpinSetupModalProps) {
  return (
    <Modal>
      <Modal.Backdrop isOpen={open} isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.Header>
              <Modal.Heading>Set your MPIN</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-4">
              <p className="text-center text-sm text-muted">
                For security, choose a new 4-digit MPIN before using the dashboard.
                You will need your account password to confirm.
              </p>
              <MpinForm submitLabel="Activate MPIN" onSuccess={onCompleted} />
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
