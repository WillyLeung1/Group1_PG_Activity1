import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";

const Record = (props) => (
  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
    <td className="p-4 align-middle">
      <input
        type="checkbox"
        checked={props.isSelected}
        onChange={() => props.toggleSelectRecord(props.record._id)}
      />
    </td>
    <td className="p-4 align-middle">{props.record.name}</td>
    <td className="p-4 align-middle">{props.record.position}</td>
    <td className="p-4 align-middle">{props.record.level}</td>
    <td className="p-4 align-middle">
      <div className="flex gap-2">
        <Link
          className="inline-flex items-center justify-center text-sm font-medium border bg-background hover:bg-slate-100 h-9 rounded-md px-3"
          to={`/edit/${props.record._id}`}
        >
          Edit
        </Link>
        <button
          className="inline-flex items-center justify-center text-sm font-medium border bg-background hover:bg-slate-100 h-9 rounded-md px-3"
          color="red"
          type="button"
          onClick={() => props.deleteRecord(props.record._id)}
        >
          Delete
        </button>
      </div>
    </td>
  </tr>
);

export default function RecordList() {
  const [records, setRecords] = useState([]);   // Contains DB data
  const [previewData, setPreviewData] = useState([]);   // Holds the preview data
  const [excelData, setExcelData] = useState([]);   // Holds the excel data
  const [filter, setFilter] = useState("");   // Used to filter out levels
  const [searchTerm, setSearchTerm] = useState("");    // Used to search for names/positions
  const [selectedRecords, setSelectedRecords] = useState([]);   // Contains selected rows in the db
  const [selectAll, setSelectAll] = useState(false);    // Bool for check all boxes

  // The hook is modified so searches in the DB returns through a filter
  useEffect(() => {
    async function getRecords() {
      const response = await fetch(`http://localhost:5050/record?level=${filter}`);
      
      // Error catch
      if (!response.ok) {
        console.error("Error:", response.statusText);
        return;
      }
      const records = await response.json();
      setRecords(records);
    }
    getRecords();
  }, [filter]);



  // Ignore caps when filtering
  const filteredRecords = records.filter((record) => {
    return (
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.position.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });



  // Select individual check boxes for the table
  const toggleSelectRecord = (id) => {
    setSelectedRecords((prevSelected) => {

      // If row ID exists in selectedRecords, remove it
      if (prevSelected.includes(id)) {
        return prevSelected.filter(
          (recordId) => recordId !== id
        );
      
      // If not, add it  
      } else {
        return [...prevSelected, id];
      }
    });
  };



  // Select all rows at once
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredRecords.map(
        (record) => record._id)
      );
    }
    setSelectAll(!selectAll);
  };



  // Delete selected rows
  const handleDeleteSelected = async () => {

    // Loop through and delete from the database
    for (let id of selectedRecords) {
      await fetch(`http://localhost:5050/record/${id}`, {
        method: "DELETE",
      });
    }

    // Reset variables to remove deleted data
    setRecords(records.filter((record) => !selectedRecords.includes(record._id)));
    setSelectedRecords([]);
    setSelectAll(false);
  };



  // Handle Excel file upload and extract data
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    // Parsing through file
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      setPreviewData(jsonData.slice(0, 10));    // Preview first 10 rows
      setExcelData(jsonData);   // Store the excel data
    };
    reader.readAsArrayBuffer(file);
  };



  // Sequentially uploads the rows from the excel file
  const handleUploadData = async () => {
    try {
      const promises = [];

      // Loop through each row in the excel file
      for (let row of excelData) {
        // Post to the db
        promises.push(
          fetch("http://localhost:5050/record/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(row),
          })
            .then((response) => {

              // Error handling
              if (!response.ok) {
                throw new Error("Error");
              }
              return response.json();
            })
            .then((json) => {
              console.log("Uploaded row:", json);
              setRecords((prevRecords) => [...prevRecords, json]);
            })
        );
      }

      // An experimental line to see if uploads run more efficiently
      // (Most likely has no effect at all)
      await Promise.all(promises);
    } catch (error) {
      console.error("Upload Error:", error);
    }
  };



  // This method will delete a record
  async function deleteRecord(id) {
    await fetch(`http://localhost:5050/record/${id}`, {
      method: "DELETE",
    });
    const newRecords = records.filter((el) => el._id !== id);
    setRecords(newRecords);
  }



  const recordList = () => {
    return filteredRecords.map((record) => (
      <Record
        key={record._id}
        record={record}
        isSelected={selectedRecords.includes(record._id)}
        toggleSelectRecord={toggleSelectRecord}
        deleteRecord={deleteRecord}
      />
    ));
  };



  return (
    <>
      <h3 className="text-lg font-semibold p-4">Employee Records</h3>

      {/* Search bar function */}
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search by name or position"
        className="p-2 border border-gray-300 rounded mb-4"
      />

      {/* Filtering function */}
      <div>
        <label>Filter by Level:</label>
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="">All</option>
          <option value="Intern">Intern</option>
          <option value="Junior">Junior</option>
          <option value="Senior">Senior</option>
        </select>
      </div>

      {/* Deleting selected rows */}
      <div className="my-4">
        <button
          className="px-4 py-2 bg-red-500 text-white rounded"
          onClick={handleDeleteSelected}
          disabled={selectedRecords.length === 0}
        >
          Delete Selected
        </button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b">
                <th className="h-12 px-4">

                  {/* Select all rows */}
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="h-12 px-4">Name</th>
                <th className="h-12 px-4">Position</th>
                <th className="h-12 px-4">Level</th>
                <th className="h-12 px-4">Action</th>
              </tr>
            </thead>
            <tbody>{recordList()}</tbody>
          </table>
        </div>
      </div>

      {/* Excel file upload */}
      <form
        onSubmit={handleFileUpload}
        className="border rounded-lg overflow-hidden p-4"
      >
        <div>
          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <h3>Preview of First 10 Rows:</h3>
          <table>
            <thead>
              <tr>
                {previewData.length > 0 &&
                  Object.keys(previewData[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
              </tr>
            </thead>

            {/* Preview of the excel data */}
            <tbody>
              {previewData.map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((value, i) => (
                    <td key={i}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Upload button */}
        <button
          type="submit"
          className="block flex-1 bg-blue-500 text-white py-1.5 pl-1 rounded sm:text-sm"
          onClick={handleUploadData}
        >
          Upload Excel
        </button>
      </form>
    </>
  );
}