import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/contexts/ToastContext";

export function getErrorMessage(error) {
  return error?.response?.data?.message || error?.message || "Request failed. Please try again.";
}

export function useNotifyMutation(options) {
  const toast = useToast();
  const { successMessage, errorMessage, limitResource, mutationFn, onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    ...mutationOptions,
    mutationFn: async (...args) => {
      if (limitResource && toast.showRememberedLimit(limitResource)) {
        const error = new Error("Subscription limit already reached");
        error.__limitGuard = true;
        throw error;
      }
      return mutationFn(...args);
    },
    onSuccess: async (...args) => {
      if (successMessage) toast.success(typeof successMessage === "function" ? successMessage(...args) : successMessage);
      await onSuccess?.(...args);
    },
    onError: async (error, ...args) => {
      if (error.__limitGuard) return;
      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.errorFromApi(error, getErrorMessage(error));
      }
      await onError?.(error, ...args);
    },
  });
}
