//Split ISO string into date and time
export function parseISO(iso: string){

    const dateObj = new Date(iso)

    //ISO -> "2025-02-03"
    const date = dateObj.toISOString().split("T")[0];

    //ISO -> "08:34"
    const time = dateObj.toISOString().split("T")[1].slice(0, 5);

    return {date, time}

} 



//FORMAT DATE TO NORWEGIAN
export function formatDateNO(iso: string) {
    const dateObj = new Date(iso);
  
    return dateObj.toLocaleDateString("nb-NO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  