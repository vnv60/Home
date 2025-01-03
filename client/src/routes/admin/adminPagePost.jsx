import React, { useState, useEffect, useContext } from "react";
import apiRequest from "../../lib/apiRequest";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import "./adminPage.scss";
import * as XLSX from "xlsx";


import { Bar,Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import Statistics from "../../components/chart/Dashboard";
import UserStatsChart from "../../components/chart/UserStatsChart";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function AdminPostPage() {

  
  const [stats, setStats] = useState({ userCount: 0, postCount: 0 });
  const { updateUser, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("baidang");
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    email: "",
    role: "nguoidung",
    address: "",
  });
  const [userFormVisible, setUserFormVisible] = useState(false);
  const [error, setError] = useState("");

  
  

  // Phân trang
  const [userPage, setUserPage] = useState(1);
  const [postPage, setPostPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!currentUser || currentUser.role !== "quantri") {
      navigate("/");
      return;
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (currentUser?.role === "quantri") {
      if (selectedTab === "thongke") {
        fetchStatistics();
      } else if (selectedTab === "nguoidung") {
        fetchUsers();
      } else if (selectedTab === "baidang") {
        fetchPosts();
      }
    }
  }, [selectedTab, currentUser]);

  const fetchStatistics = async () => {
  try {
    const userRes = await apiRequest.get("/users");
    const postRes = await apiRequest.get("/posts");

    const posts = postRes.data;

    // Thống kê bài đăng theo trạng thái
    const approvedPosts = posts.filter(post => post.status === "duyet").length;
    const pendingPosts = posts.filter(post => post.status === "choduyet").length;

    // Thống kê bài đăng bị khóa
    const lockedPosts = posts.filter(post => post.look === "khoa").length;
    const unlockedPosts = posts.filter(post => post.look === "khongkhoa").length;

    setStats({
      userCount: userRes.data.users.length,
      postCount: posts.length,
      approvedPosts,
      pendingPosts,
      lockedPosts,
      unlockedPosts,
    });
  } catch (err) {
    console.error("Fetch error:", err);
  }
};


  const fetchUsers = async () => {
    try {
      const res = await apiRequest.get("/users");
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await apiRequest.get("/posts");
      setPosts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const paginateData = (data, page) => {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  };

  const handleLogout = async () => {
    try {
      await apiRequest.post("/auth/logout");
      updateUser(null);
      navigate("/");
    } catch (err) {
      console.log(err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const { username, password, email, role, address } = newUser;

    // Kiểm tra mật khẩu
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    try {
      await apiRequest.post("/auth/register", {
        username,
        password,
        email,
        role,
        ...(role !== "nguoidung" && { address }), 
      });
      
      alert("Tạo người dùng thành công!");
      setNewUser({
        username: "",
        password: "",
        email: "",
        role: "nguoidung",
        address: "",
      });
      setUserFormVisible(false);
      fetchUsers(); 
      setError(""); // Xóa bất kỳ lỗi nào trước đó
    } catch (err) {
      setError(err.response?.data?.message || "Đã xảy ra lỗi khi tạo người dùng");
    }
  };

  const handleDeleteUser = async (userId) => {
    // Ngăn không cho xóa chính mình
    if (userId === currentUser.id) {
      alert("Bạn không thể xóa tài khoản của chính mình!");
      return;
    }

    if (!window.confirm("Bạn có chắc chắn muốn xóa người dùng này?")) return;
    
    try {
      await apiRequest.delete(`/users/${userId}`);
      alert("Xóa người dùng thành công!");
      fetchUsers(); 
    } catch (err) {
      alert(err.response?.data?.message || "Không thể xóa người dùng này.");
    }
  };

  const exportToExcel = () => {
    if (users.length === 0) {
      alert("Không có dữ liệu để xuất!");
      return;
    }
  
    // Chuyển đổi danh sách người dùng thành định dạng bảng
    const data = users.map((user, index) => ({
      STT: index + 1,
      "Tên người dùng": user.username,
      "Email": user.email,
      "Vai trò": user.role,
      "Địa chỉ": user.address || "Không có",
    }));
  
    // Tạo WorkBook và WorkSheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
  
    // Xuất file Excel
    XLSX.writeFile(workbook, "DanhSachNguoiDung.xlsx");
  };
  
  const handleToggleLock = async (postId, currentLook) => {
    const isLocking = currentLook === "khongkhoa"; // Nếu trạng thái hiện tại là "không khóa", thì sẽ khóa
    const confirmationMessage = isLocking
      ? "Bạn có chắc chắn muốn khóa bài đăng này?"
      : "Bạn có chắc chắn muốn hủy khóa bài đăng này?";
  
    if (!window.confirm(confirmationMessage)) return;
  
    try {
      const res = await apiRequest.patch(`/posts/search/${postId}`, {
        look: isLocking ? "khoa" : "khongkhoa",
      });
  
      alert(res.data.message); // Hiển thị thông báo từ server
      fetchPosts(); // Tải lại danh sách bài đăng sau khi cập nhật
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.message ||
          "Đã xảy ra lỗi khi thay đổi trạng thái khóa của bài đăng."
      );
    }
  };
  


  const [searchTerm, setSearchTerm] = useState(""); // Trạng thái lưu từ khóa tìm kiếm

const handleSearch = (e) => {
  setSearchTerm(e.target.value);
};

// Lọc bài đăng dựa trên từ khóa
const [postApprovalFilter, setPostApprovalFilter] = useState(""); // Trạng thái duyệt

// Lọc bài đăng dựa trên từ khóa và bộ lọc trạng thái duyệt
const filteredPosts = posts.filter((post) => {
  const matchesSearchTerm =
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.address.toLowerCase().includes(searchTerm.toLowerCase())||
    post.type.toLowerCase().includes(searchTerm.toLowerCase())||
    post.buystatus.toLowerCase().includes(searchTerm.toLowerCase())||
    post.rentstatus.toLowerCase().includes(searchTerm.toLowerCase())||
    post.property.toLowerCase().includes(searchTerm.toLowerCase())||
    post.city.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesApprovalFilter =
    postApprovalFilter === "" || post.status === postApprovalFilter;

  return matchesSearchTerm && matchesApprovalFilter;
});


const [searchTermUser, setSearchTermUser] = useState("");
const handleSearchUser = (e) => {
  setSearchTermUser(e.target.value);
};

// Lọc người dùng dựa trên từ khóa
const [userLockFilter, setUserLockFilter] = useState(""); // Lọc trạng thái khóa
const [userApprovalFilter, setUserApprovalFilter] = useState(""); // Lọc trạng thái duyệt

// Lọc người dùng dựa trên từ khóa và bộ lọc
const filteredUsers = users.filter((user) => {
  const matchesSearchTerm =
    user.username.toLowerCase().includes(searchTermUser.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTermUser.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTermUser.toLowerCase());

  const matchesLockFilter =
    userLockFilter === "" || user.userlook === userLockFilter;

  const matchesApprovalFilter =
    userApprovalFilter === "" || user.userstatus === userApprovalFilter;

  return matchesSearchTerm && matchesLockFilter && matchesApprovalFilter;
});



// khóa người dùng

const handleToggleUserLock = async (userId, currentLook) => {
  const isLocking = currentLook === "khongkhoa";
  const confirmationMessage = isLocking
    ? "Bạn có chắc chắn muốn hủy khóa người dùng này?"
    : "Bạn có chắc chắn muốn khóa người dùng này?";

  if (!window.confirm(confirmationMessage)) return;

  try {
    const res = await apiRequest.patch(`/users/search/${userId}`, {
      userlook: isLocking ? "khoa" : "khongkhoa",
    });

    alert(res.data.message); // Hiển thị thông báo từ server
    fetchUsers(); // Tải lại danh sách người dùng sau khi cập nhật
  } catch (err) {
    console.error(err);
    alert(
      err.response?.data?.message ||
      "Đã xảy ra lỗi khi thay đổi trạng thái khóa của người dùng."
    );
  }
};





  // Nếu không phải admin thì không được truy cập
  if (!currentUser || currentUser.role !== 'quantri') {
    return null;
  }


  return (
    <div className="adminPage">
      <div className="adminSidebar">
        <Link to={"/profile/admin/dashboard"}>
                    <button
                      onClick={() => setSelectedTab("trangdieukhien")}
                      className={selectedTab === "trangdieukhien" ? "active" : ""}
                    >
                      Bảng điều khiển 
                    </button>
                  </Link>
      <Link to={"/profile/admin"}>
        <button
          onClick={() => setSelectedTab("thongke")}
          className={selectedTab === "thongke" ? "active" : ""}
        >
          Thống kê
        </button>
      </Link>
      <Link to={"/profile/admin/user"}>
        <button
          onClick={() => setSelectedTab("nguoidung")}
          className={selectedTab === "nguoidung" ? "active" : ""}
        >
          Người dùng
        </button>
      </Link>
      <Link to={"/profile/admin/post"}>
        <button
          onClick={() => setSelectedTab("baidang")}
          className={selectedTab === "baidang" ? "active" : ""}
        >
          Bài đăng
        </button>
      </Link>
      <Link to={"/profile/admin/profile"}>
        <button
          onClick={() => setSelectedTab("thongtincanhan")}
          className={selectedTab === "thongtincanhan" ? "active" : ""}
        >
          Thông tin cá nhân
        </button>
      </Link>
    </div>
      <div className="adminContent">
      

       
{selectedTab === "baidang" && (
  <div>
    <h2>Danh sách bài đăng</h2>
    {/* Khung tìm kiếm */}
    <div className="searchContainer">
      <input
        type="text"
        placeholder="Tìm kiếm theo tiêu đề hoặc địa chỉ..."
        value={searchTerm}
        onChange={handleSearch}
        className="searchInput"
      />
      {/*
      <div className="filterContainer">
        <label>
          Trạng thái duyệt:
          <select
            value={postApprovalFilter}
            onChange={(e) => setPostApprovalFilter(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="choduyet">Chờ duyệt</option>
            <option value="duyet">Đã duyệt</option>
          </select>
        </label>
      </div>
      */}
    </div>

    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th>Tiêu đề</th>
          <th>Địa chỉ</th>
          {/*<th>Trạng thái</th>*/}
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        {paginateData(filteredPosts, postPage).map((post, index) => (
          <tr key={post.id}>
            <td>{(postPage - 1) * itemsPerPage + index + 1}</td>
            <td>{post.title}</td>
            <td>{post.address}</td>
            
            {/*<td>{post.status}</td>*/}
            <td>
              <Link to={`/profile/admin/post/edit/${post.id}`}>
                <button className="duyet">Xem chi tiết </button>
                
                {/*<button className="duyet">{post.status === "duyet" ? "Hủy duyệt" : "Duyệt"} </button>*/}
              </Link>
              
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <div className="pagination">
      <button
        disabled={postPage === 1}
        onClick={() => setPostPage(postPage - 1)}
      >
        Trước
      </button>
      <span>Trang {postPage}</span>
      <button
        disabled={postPage * itemsPerPage >= filteredPosts.length}
        onClick={() => setPostPage(postPage + 1)}
      >
        Sau
      </button>
    </div>
  </div>
)}

        {selectedTab === "thongtincanhan" && (
          <div>
            <h2>Thông tin cá nhân</h2>
            <div className="title">
              <Link to="/profile/update">
                <button>Cập nhật hồ sơ</button>
              </Link>
            </div>
            <div className="info">
              <span>
                Ảnh đại diện:
                <img src={currentUser.avatar || "noavatar.png"} alt="Avatar" />
              </span>
              <span>Tên người dùng: <b>{currentUser.username}</b></span>
              <span>E-mail: <b>{currentUser.email}</b></span>
              {currentUser.role === "quantri" && (
                <span>Địa chỉ: <b>{currentUser.address}</b></span>
              )}
              <button onClick={handleLogout}>Đăng xuất</button>
            </div>
          </div>
        )}

      {/*
      
      */}


      </div>
      
    </div>
  );
}

export default AdminPostPage;
