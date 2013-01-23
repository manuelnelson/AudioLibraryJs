using System.Collections.Generic;
using AudioLibrary.Models;

namespace AudioLibrary.DataInterface
{
    public interface IToDoRepository : IRepository<ToDo>
    {
        IEnumerable<ToDo> GetRecent();
    }
}
