using System.Collections.Generic;
using System.Linq;
using AudioLibrary.DataInterface;
using AudioLibrary.Models;

namespace AudioLibrary.DataContext.Repositories
{
    public class ToDoRepository : Repository<ToDo>, IToDoRepository
    {
        public ToDoRepository(IUnitOfWork unitOfWork) : base(unitOfWork)
        {
        }

        public IEnumerable<ToDo> GetRecent()
        {
            return GetDbSet().OrderByDescending(@do => @do.Id).Take(10);
        }
    }
}