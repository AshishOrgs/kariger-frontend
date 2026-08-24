import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { ALL_BRANCHES, getSelectedBranchId, setSelectedBranchId as persistSelectedBranchId } from "@/services/api";
import { branchesApi } from "@/services/modules";
import { PERMISSIONS } from "@/utils/permissions";

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const { accessScope, hasPermission } = useAuth();
  const hasBranchVisibility = hasPermission(PERMISSIONS.BRANCH_VIEW, PERMISSIONS.BRANCH_MANAGE);
  const canSelectAcrossBranches = ["allBranches", "platform", "selectedBranches"].includes(accessScope?.branchScope);
  const [selectedBranchId, setSelectedBranchIdState] = useState(() => getSelectedBranchId() || ALL_BRANCHES);

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: branchesApi.list,
    enabled: hasBranchVisibility,
    staleTime: 10 * 60_000, // branches rarely change during a session
  });

  useEffect(() => {
    if (!canSelectAcrossBranches) {
      persistSelectedBranchId("");
      setSelectedBranchIdState(ALL_BRANCHES);
    }
  }, [canSelectAcrossBranches]);

  const branches = useMemo(() => branchesQuery.data?.data?.branches || [], [branchesQuery.data]);

  const setSelectedBranchId = (branchId) => {
    const nextBranchId = branchId || ALL_BRANCHES;
    setSelectedBranchIdState(nextBranchId);
    persistSelectedBranchId(nextBranchId === ALL_BRANCHES ? "" : nextBranchId);
  };

  return (
    <BranchContext.Provider
      value={{
        allBranchesValue: ALL_BRANCHES,
        branches,
        isLoading: branchesQuery.isLoading,
        refetch: branchesQuery.refetch,
        selectedBranchId,
        setSelectedBranchId,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error("useBranch must be used inside BranchProvider");
  }
  return context;
}
